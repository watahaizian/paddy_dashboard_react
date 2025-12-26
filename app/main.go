package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type EchoRequest struct {
	Text string `json:"text" form:"text"`
}

type Field struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	OwnerName string  `json:"ownerName,omitempty"`
}

type Point struct {
	T        int64    `json:"t"` // epoch millis
	WaterCm  *float64 `json:"waterCm,omitempty"`
	Temp     *float64 `json:"temp,omitempty"`
	Battery  *float64 `json:"battery,omitempty"`
	Measured string   `json:"measured,omitempty"` // 参考用
}

type FieldDataResponse struct {
	Points []Point `json:"points"`
	Last   *Point  `json:"last,omitempty"`
}

func main() {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Hello world（ブラウザで見えるやつ）
	r.GET("/", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8",
			[]byte("<h1>Hello world</h1><p>Gin + Nginx + Docker</p>"))
	})

	// 動作確認
	r.GET("/api/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// POST動作確認
	r.POST("/api/echo", func(c *gin.Context) {
		var req EchoRequest
		if err := c.ShouldBind(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"you_sent": req.Text})
	})

	// ===== ここから本題：FlutterのAPI移植 =====

	// 圃場一覧（正規化）
	r.GET("/api/fields", func(c *gin.Context) {
		base := upstreamBaseURL()
		endpoint := base + "/app/paddy/get_devices"

		raw, err := httpGETJSON(endpoint, nil)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}

		arr, ok := raw.([]any)
		if !ok {
			c.JSON(http.StatusBadGateway, gin.H{"error": "invalid payload (expected array)"})
			return
		}

		fields := make([]Field, 0, len(arr))
		for _, v := range arr {
			m, ok := v.(map[string]any)
			if !ok {
				continue
			}
			f, err := parseFieldSummary(m)
			if err != nil {
				continue
			}
			fields = append(fields, f)
		}
		if len(fields) == 0 {
			c.JSON(http.StatusBadGateway, gin.H{"error": "no fields"})
			return
		}

		// Flutter版と同じ：最低3件になるようにダミー追加（不要なら消してOK）
		fields = ensureAtLeast3(fields)

		c.JSON(http.StatusOK, fields)
	})

	// 圃場データ（正規化）
	// 例: /api/fields/xxx/data?from=2025-12-22T00:00:00+09:00&to=2025-12-23T00:00:00+09:00
	r.GET("/api/fields/:id/data", func(c *gin.Context) {
		padID := c.Param("id")
		loc := mustTokyoLocation()

		// from/to がなければ直近24h
		now := time.Now().In(loc)
		from, to := parseRange(c.Query("from"), c.Query("to"), now, loc)

		base := upstreamBaseURL()
		endpoint := base + "/app/paddy/get_device_data"

		qs := url.Values{}
		qs.Set("padid", padID)
		qs.Set("fromd", formatUpstreamTime(from))
		qs.Set("tod", formatUpstreamTime(to))

		raw, err := httpGETJSON(endpoint, qs)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}

		arr, ok := raw.([]any)
		if !ok {
			c.JSON(http.StatusBadGateway, gin.H{"error": "invalid payload (expected array)"})
			return
		}

		points := make([]Point, 0, len(arr))
		for _, v := range arr {
			m, ok := v.(map[string]any)
			if !ok {
				continue
			}
			p, ok := parseDeviceDataPoint(m, loc)
			if !ok {
				continue
			}
			points = append(points, p)
		}

		sort.Slice(points, func(i, j int) bool { return points[i].T < points[j].T })

		var last *Point
		if len(points) > 0 {
			cp := points[len(points)-1]
			last = &cp
		}

		c.JSON(http.StatusOK, FieldDataResponse{Points: points, Last: last})
	})

	_ = r.Run(":8080")
}

// ====== upstream/proxy helpers ======

func upstreamBaseURL() string {
	if v := os.Getenv("AMBERLOGIX_BASE_URL"); v != "" {
		return v
	}
	return "http://dev.amberlogix.co.jp"
}

func httpGETJSON(endpoint string, qs url.Values) (any, error) {
	u := endpoint
	if qs != nil && len(qs) > 0 {
		u = u + "?" + qs.Encode()
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest(http.MethodGet, u, nil)
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upstream request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("upstream HTTP %d", resp.StatusCode)
	}

	var decoded any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, fmt.Errorf("upstream decode failed: %w", err)
	}
	return decoded, nil
}

// ====== parsing/normalization ======

func parseFieldSummary(m map[string]any) (Field, error) {
	lat := parseDouble(firstNonNil(m, "latitude", "lat", "LAT", "Latitude"))
	lon := parseDouble(firstNonNil(m, "longitude", "lon", "LON", "Longitude"))
	if lat == nil || lon == nil {
		return Field{}, fmt.Errorf("missing coordinates")
	}

	id := stringify(firstNonNil(m, "padid", "id"))
	if id == "" {
		return Field{}, fmt.Errorf("missing id")
	}
	name := stringify(firstNonNil(m, "paddyname", "name"))
	if name == "" {
		name = "圃場"
	}
	owner := stringify(firstNonNil(m, "owner_name", "owner"))

	return Field{
		ID:        id,
		Name:      name,
		Lat:       *lat,
		Lon:       *lon,
		OwnerName: owner,
	}, nil
}

func parseDeviceDataPoint(m map[string]any, loc *time.Location) (Point, bool) {
	measuredRaw := stringify(firstNonNil(m, "measured_date", "measured", "timestamp"))
	if measuredRaw == "" {
		return Point{}, false
	}
	tm, ok := parseTimeFlex(measuredRaw, loc)
	if !ok {
		return Point{}, false
	}
	p := Point{
		T:        tm.UnixMilli(),
		Measured: measuredRaw,
	}

	// waterlevel: mm -> cm
	if v := parseDouble(firstNonNil(m, "waterlevel")); v != nil {
		cm := *v / 10.0
		p.WaterCm = &cm
	}
	if v := parseDouble(firstNonNil(m, "temperature")); v != nil {
		p.Temp = v
	}
	if v := parseDouble(firstNonNil(m, "battery")); v != nil {
		p.Battery = v
	}
	return p, true
}

func ensureAtLeast3(fields []Field) []Field {
	if len(fields) >= 3 {
		return fields
	}
	baseLat, baseLon := fields[0].Lat, fields[0].Lon
	offsets := [][2]float64{
		{0.0010, 0.0015},
		{-0.0012, 0.0020},
		{0.0008, -0.0018},
	}
	i := 1
	for _, off := range offsets {
		if len(fields) >= 3 {
			break
		}
		fields = append(fields, Field{
			ID:        fmt.Sprintf("dummy-%d", i),
			Name:      fmt.Sprintf("仮圃場%d", i),
			Lat:       baseLat + off[0],
			Lon:       baseLon + off[1],
			OwnerName: "ダミー所有者",
		})
		i++
	}
	return fields
}

func firstNonNil(m map[string]any, keys ...string) any {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			return v
		}
	}
	return nil
}

func stringify(v any) string {
	if v == nil {
		return ""
	}
	s := fmt.Sprintf("%v", v)
	return s
}

func parseDouble(v any) *float64 {
	switch x := v.(type) {
	case nil:
		return nil
	case float64:
		return &x
	case float32:
		f := float64(x)
		return &f
	case int:
		f := float64(x)
		return &f
	case int64:
		f := float64(x)
		return &f
	case json.Number:
		f, err := x.Float64()
		if err == nil {
			return &f
		}
		return nil
	case string:
		if x == "" {
			return nil
		}
		f, err := strconv.ParseFloat(x, 64)
		if err == nil {
			return &f
		}
		return nil
	default:
		// たまに数値っぽい型が混ざるので最後の悪あがき
		s := stringify(x)
		f, err := strconv.ParseFloat(s, 64)
		if err == nil {
			return &f
		}
		return nil
	}
}

func mustTokyoLocation() *time.Location {
	loc, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		return time.Local
	}
	return loc
}

func parseRange(fromQ, toQ string, now time.Time, loc *time.Location) (time.Time, time.Time) {
	to := now
	from := now.Add(-24 * time.Hour)

	if fromQ != "" {
		if t, ok := parseTimeFlex(fromQ, loc); ok {
			from = t
		}
	}
	if toQ != "" {
		if t, ok := parseTimeFlex(toQ, loc); ok {
			to = t
		}
	}
	if to.Before(from) {
		// 入れ替え
		from, to = to, from
	}
	return from, to
}

// upstreamが欲しがる形式：yyyy-MM-dd HH:mm:ss
func formatUpstreamTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

// 受け取りは柔軟に（ISO/RFC3339、"yyyy-MM-dd HH:mm:ss"、epoch millis）
func parseTimeFlex(s string, loc *time.Location) (time.Time, bool) {
	// epoch millis
	if ms, err := strconv.ParseInt(s, 10, 64); err == nil && ms > 1_000_000_000_000 {
		return time.UnixMilli(ms).In(loc), true
	}
	// RFC3339
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.In(loc), true
	}
	// "yyyy-MM-dd HH:mm:ss"
	if t, err := time.ParseInLocation("2006-01-02 15:04:05", s, loc); err == nil {
		return t.In(loc), true
	}
	// "yyyy-MM-ddTHH:mm:ss"（タイムゾーン無し）
	if t, err := time.ParseInLocation("2006-01-02T15:04:05", s, loc); err == nil {
		return t.In(loc), true
	}
	return time.Time{}, false
}
