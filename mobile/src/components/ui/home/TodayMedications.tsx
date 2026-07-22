import { ScrollView, Text, View, Pressable } from "react-native";
import {
    Pill,
    Clock3,
    CircleCheck,
    CircleX,
    Timer
} from "lucide-react-native";

export type MedicationStatus =
    | "taken"
    | "pending"
    | "missed";

export type TodayMedication = {

    id: string;

    name: string;

    dosage: string;

    hour: string;

    status: MedicationStatus;

};

type Props = {

    medications: TodayMedication[];

    onPressMedication?: (id: string) => void;

};

function getStatus(status: MedicationStatus){

    switch(status){

        case "taken":

            return{

                background:"#DCFCE7",

                icon:"#22C55E",

                text:"Tomado",

                Icon:CircleCheck

            }

        case "missed":

            return{

                background:"#FEE2E2",

                icon:"#EF4444",

                text:"Omitido",

                Icon:CircleX

            }

        default:

            return{

                background:"#FEF3C7",

                icon:"#F59E0B",

                text:"Pendiente",

                Icon:Timer

            }

    }

}

export default function TodayMedications({

    medications,

    onPressMedication

}:Props){

    return(

        <View className="mt-5">

            <Text className="text-lg font-bold text-slate-900 mb-4">

                Medicamentos de hoy

            </Text>

            {medications.length === 0 ? (

                <View className="bg-white rounded-3xl border border-slate-100 px-4 py-6 items-center">
                    <Text className="text-slate-500">Sin tomas programadas para hoy</Text>
                </View>

            ) : (

            <ScrollView

                horizontal

                showsHorizontalScrollIndicator={false}

            >

                {

                    medications.map((med)=>{

                        const status=getStatus(med.status);

                        const Icon=status.Icon;

                        return(

                            <Pressable

                                key={med.id}

                                onPress={()=>onPressMedication?.(med.id)}

                                className="bg-white rounded-3xl border border-slate-100 p-5 mr-4"

                                style={{

                                    width:220,

                                    shadowColor:"#000",

                                    shadowOpacity:0.05,

                                    shadowRadius:8,

                                    elevation:2

                                }}

                            >

                                <View className="flex-row justify-between items-start">

                                    <View

                                        className="w-12 h-12 rounded-2xl justify-center items-center"

                                        style={{

                                            backgroundColor:"#DBEAFE"

                                        }}

                                    >

                                        <Pill

                                            color="#2563EB"

                                            size={24}

                                        />

                                    </View>

                                    <View

                                        className="rounded-full px-3 py-1"

                                        style={{

                                            backgroundColor:status.background

                                        }}

                                    >

                                        <Text

                                            style={{

                                                color:status.icon,

                                                fontWeight:"600"

                                            }}

                                        >

                                            {status.text}

                                        </Text>

                                    </View>

                                </View>

                                <Text className="text-slate-900 font-bold text-lg mt-5">

                                    {med.name}

                                </Text>

                                <Text className="text-slate-500 mt-1">

                                    {med.dosage}

                                </Text>

                                <View className="flex-row items-center mt-5">

                                    <Clock3

                                        color="#64748B"

                                        size={18}

                                    />

                                    <Text className="text-slate-600 ml-2">

                                        {med.hour}

                                    </Text>

                                </View>

                                <View className="mt-6 items-end">

                                    <View

                                        className="w-10 h-10 rounded-full items-center justify-center"

                                        style={{

                                            backgroundColor:status.background

                                        }}

                                    >

                                        <Icon

                                            color={status.icon}

                                            size={22}

                                        />

                                    </View>

                                </View>

                            </Pressable>

                        )

                    })

                }

            </ScrollView>

            )}

        </View>

    )

}
