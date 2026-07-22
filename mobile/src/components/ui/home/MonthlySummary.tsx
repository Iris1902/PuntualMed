import { CheckCircle2, Clock3, XCircle, Activity } from "lucide-react-native";
import { Text, View } from "react-native";

type Props = {
  taken: number;
  pending: number;
  missed: number;
  symptoms: number;
};

function SummaryCard({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ReactNode;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View
      className="bg-white rounded-3xl p-4 flex-1 border border-slate-100"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center"
        style={{
          backgroundColor: color,
        }}
      >
        {icon}
      </View>

      <Text className="text-3xl font-bold text-slate-900 mt-4">

        {value}

      </Text>

      <Text className="text-slate-500 mt-1">

        {label}

      </Text>

    </View>
  );
}

export default function MonthlySummary({
  taken,
  pending,
  missed,
  symptoms,
}: Props) {
  return (
    <View className="mt-5">

      <Text className="text-lg font-bold text-slate-900 mb-4">

        Resumen del mes

      </Text>

      <View className="flex-row">

        <SummaryCard
          value={taken}
          label="Tomadas"
          color="#DCFCE7"
          icon={<CheckCircle2 color="#22C55E" size={24} />}
        />

        <View className="w-3" />

        <SummaryCard
          value={pending}
          label="Pendientes"
          color="#FEF3C7"
          icon={<Clock3 color="#F59E0B" size={24} />}
        />

      </View>

      <View className="h-3" />

      <View className="flex-row">

        <SummaryCard
          value={missed}
          label="Omitidas"
          color="#FEE2E2"
          icon={<XCircle color="#EF4444" size={24} />}
        />

        <View className="w-3" />

        <SummaryCard
          value={symptoms}
          label="Síntomas"
          color="#DBEAFE"
          icon={<Activity color="#2563EB" size={24} />}
        />

      </View>

    </View>
  );
}
