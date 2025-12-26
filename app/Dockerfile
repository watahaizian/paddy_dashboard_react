FROM golang:1.25.5-alpine AS build
WORKDIR /src

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

FROM alpine:3.23.2
RUN apk add --no-cache ca-certificates && adduser -D appuser
USER appuser
WORKDIR /home/appuser

ENV GIN_MODE=release
COPY --from=build /out/server ./server

EXPOSE 8080
CMD ["./server"]