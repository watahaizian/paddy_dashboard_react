import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Field, UnassignedSensor } from "./types";
import { fetchFieldData, fetchFields, fetchSensorData, fetchUnassignedSensors } from "./api";
import MapSection from "./components/MapSection";
import FieldDetailSection from "./components/FieldDetailSection";
import SensorDetailSection from "./components/SensorDetailSection";
import BottomSummarySection from "./components/BottomSummarySection";
import WorkerDataSection from "./components/WorkerDataSection";

const EMPTY_FIELDS: Field[] = [];
const EMPTY_UNASSIGNED_SENSORS: UnassignedSensor[] = [];

type SelectionMode = "field" | "sensor";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const App = () => {
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(undefined);
  const [selectedSensorId, setSelectedSensorId] = useState<string | undefined>(undefined);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("field");

  const fieldsQuery = useQuery({
    queryKey: ["fields"],
    queryFn: ({ signal }) => fetchFields(signal),
    staleTime: 30_000,
  });
  const fields = fieldsQuery.data ?? EMPTY_FIELDS;

  const unassignedSensorsQuery = useQuery({
    queryKey: ["unassignedSensors"],
    queryFn: ({ signal }) => fetchUnassignedSensors(signal),
    staleTime: 30_000,
  });
  const unassignedSensors = unassignedSensorsQuery.data ?? EMPTY_UNASSIGNED_SENSORS;

  const effectiveSelectedFieldId =
    selectedFieldId != null && fields.some((field) => field.id === selectedFieldId)
      ? selectedFieldId
      : fields[0]?.id;

  const selectedField = useMemo(
    () => fields.find((field) => field.id === effectiveSelectedFieldId) ?? (fields[0] ?? null),
    [effectiveSelectedFieldId, fields],
  );

  const effectiveSelectedSensorId =
    selectedSensorId != null && unassignedSensors.some((sensor) => sensor.id === selectedSensorId)
      ? selectedSensorId
      : unassignedSensors[0]?.id;

  const selectedSensor = useMemo(
    () => unassignedSensors.find((sensor) => sensor.id === effectiveSelectedSensorId) ?? (unassignedSensors[0] ?? null),
    [effectiveSelectedSensorId, unassignedSensors],
  );

  const activeMode: SelectionMode = selectionMode === "sensor" && selectedSensor ? "sensor" : "field";

  const dataQuery = useQuery({
    queryKey: [
      "monitoringData",
      activeMode,
      activeMode === "sensor" ? (selectedSensor?.id ?? "") : (selectedField?.id ?? ""),
    ],
    queryFn: ({ signal }) => {
      if (activeMode === "sensor") {
        return fetchSensorData(selectedSensor!.id, signal);
      }
      return fetchFieldData(selectedField!.id, signal);
    },
    enabled: activeMode === "sensor" ? !!selectedSensor : !!selectedField,
    staleTime: 10_000,
  });

  const data = dataQuery.data ?? null;
  const loadingData = dataQuery.isLoading || dataQuery.isFetching;
  const dataError = dataQuery.error ? toErrorMessage(dataQuery.error) : null;
  const unassignedSensorsError = unassignedSensorsQuery.error
    ? toErrorMessage(unassignedSensorsQuery.error)
    : null;

  const refresh = () => {
    void dataQuery.refetch();
  };

  if (fieldsQuery.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        読み込み中…
      </div>
    );
  }

  if (fieldsQuery.isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 p-6">
        <div className="max-w-xl w-full bg-white border rounded-2xl p-6 space-y-4">
          <div className="text-red-600">
            データ取得に失敗しました: {toErrorMessage(fieldsQuery.error)}
          </div>
          <button
            className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50"
            onClick={() => void fieldsQuery.refetch()}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="h-16 bg-slate-800 text-white flex items-center px-6 font-black tracking-widest">
        圃場管理ダッシュボード
      </header>

      <main className="px-8 py-6">
        <div className="block min-[960px]:hidden space-y-6">
          <div className="h-[40vh] min-h-[320px]">
            <MapSection
              fields={fields}
              unassignedSensors={unassignedSensors}
              selectedFieldId={activeMode === "field" ? selectedField?.id : undefined}
              selectedSensorId={activeMode === "sensor" ? selectedSensor?.id : undefined}
              onSelectField={(field) => {
                setSelectedFieldId(field.id);
                setSelectionMode("field");
              }}
              onSelectUnassignedSensor={(sensor) => {
                setSelectedSensorId(sensor.id);
                setSelectionMode("sensor");
              }}
              unassignedSensorsError={unassignedSensorsError}
            />
          </div>

          <div className="h-[200px]">
            <BottomSummarySection isCompact />
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 max-h-[50vh] overflow-auto">
              {activeMode === "sensor" ? (
                <SensorDetailSection
                  isCompact
                  sensor={selectedSensor}
                  data={data}
                  loading={loadingData}
                  error={dataError}
                  onRefresh={refresh}
                  wrapContent
                />
              ) : (
                <FieldDetailSection
                  isCompact
                  field={selectedField}
                  data={data}
                  loading={loadingData}
                  error={dataError}
                  onRefresh={refresh}
                  wrapContent
                />
              )}
            </div>
          </div>
        </div>

        <div className="hidden min-[960px]:flex gap-6 h-[calc(100vh-64px-48px)] min-h-0">
          <div className="flex-[7] min-w-0 flex flex-col gap-6 min-h-0">
            <div className="flex-1 min-h-0">
              <MapSection
                fields={fields}
                unassignedSensors={unassignedSensors}
                selectedFieldId={activeMode === "field" ? selectedField?.id : undefined}
                selectedSensorId={activeMode === "sensor" ? selectedSensor?.id : undefined}
                onSelectField={(field) => {
                  setSelectedFieldId(field.id);
                  setSelectionMode("field");
                }}
                onSelectUnassignedSensor={(sensor) => {
                  setSelectedSensorId(sensor.id);
                  setSelectionMode("sensor");
                }}
                unassignedSensorsError={unassignedSensorsError}
              />
            </div>
            <div className="h-[180px]">
              <BottomSummarySection isCompact={false} />
            </div>
          </div>

          <div className="flex-[5] min-w-0 min-h-0 flex flex-col gap-6">
            <div className="flex-[7] min-h-0 overflow-auto">
              {activeMode === "sensor" ? (
                <SensorDetailSection
                  isCompact={false}
                  sensor={selectedSensor}
                  data={data}
                  loading={loadingData}
                  error={dataError}
                  onRefresh={refresh}
                  wrapContent={false}
                />
              ) : (
                <FieldDetailSection
                  isCompact={false}
                  field={selectedField}
                  data={data}
                  loading={loadingData}
                  error={dataError}
                  onRefresh={refresh}
                  wrapContent={false}
                />
              )}
            </div>
            <WorkerDataSection />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
