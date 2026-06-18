workspace "PuntualMed" "App movil de gestion y adherencia a tratamientos medicos." {

    model {
        patient = person "Paciente" "Persona que sigue un tratamiento medico."
        caregiver = person "Familiar de seguimiento" "Recibe alertas cuando el paciente no toma su medicamento."

        glm = softwareSystem "Zhipu GLM" "Modelos de IA con vision y texto: OCR de recetas y analisis de sintomas/adherencia." "External"
        telegram = softwareSystem "Telegram" "Mensajeria para alertas al familiar y vinculacion del bot." "External"
        expo = softwareSystem "Expo Push" "Servicio de notificaciones push a la app movil." "External"
        supabaseAuth = softwareSystem "Supabase Auth" "Autenticacion y emision de JWT." "External"

        puntualmed = softwareSystem "PuntualMed" "Gestion de medicamentos, recordatorios, sintomas y agente de IA." {

            mobile = container "App Movil" "UI, captura de fotos (receta y confirmacion), recibe recordatorios." "React Native + Expo + TypeScript"

            api = container "API" "Logica de negocio y API REST (monolito modular)." "Python + FastAPI" {
                users = component "users" "Perfil, familiares de seguimiento, push token." "FastAPI + SQLAlchemy"
                meds = component "meds" "Medicamentos, dosis, horarios y duracion del tratamiento." "FastAPI + SQLAlchemy"
                reminders = component "reminders" "Tomas programadas y confirmacion con foto." "FastAPI + SQLAlchemy"
                symptoms = component "symptoms" "Registro de sintomas inusuales." "FastAPI + SQLAlchemy"
                calendar = component "calendar" "Agrega la adherencia por dia." "FastAPI + SQLAlchemy"
                ai = component "ai" "OCR de recetas y consultas al agente (sintomas, adherencia, efectos)." "FastAPI + httpx + Pydantic"
                notifications = component "notifications" "Envio a Telegram y Expo Push." "httpx"
                aiProvider = component "AIProvider" "Abstraccion de IA; implementacion GLM por defecto." "Python Protocol"
            }

            worker = container "Worker" "Recordatorios y alertas programadas (scheduler)." "Python + APScheduler"

            database = container "Base de datos y Storage" "Datos clinicos y fotos." "PostgreSQL / Supabase" "Database"
        }

        # Nivel contexto / contenedor
        patient -> mobile "Registra meds y sintomas, confirma tomas, consulta al agente"
        mobile -> supabaseAuth "Registro e inicio de sesion" "HTTPS"
        mobile -> api "Llama" "HTTPS/REST + JWT"
        expo -> mobile "Entrega recordatorios" "Push"
        api -> database "Lee y escribe" "SQL"
        api -> glm "OCR de recetas y analisis" "HTTPS"
        worker -> database "Lee horarios y marca tomas perdidas" "SQL"
        worker -> expo "Solicita el envio de recordatorios" "HTTPS"
        worker -> telegram "Envia alertas al familiar" "Bot API"
        telegram -> api "Webhook de vinculacion del bot (/start)" "HTTPS"
        telegram -> caregiver "Notifica"

        # Nivel componente (dentro de api)
        ai -> aiProvider "Usa"
        aiProvider -> glm "Llama (vision + texto)" "HTTPS"
        ai -> meds "Lee medicamentos"
        ai -> symptoms "Lee sintomas"
        ai -> reminders "Lee historial de tomas"
        ai -> database "Guarda historial de chat"
        calendar -> reminders "Lee tomas"
        calendar -> symptoms "Lee sintomas"
        notifications -> telegram "Envia alertas" "Bot API"
        notifications -> expo "Solicita recordatorios" "Push"
        users -> database "Lee/escribe"
        meds -> database "Lee/escribe"
        reminders -> database "Lee/escribe"
        symptoms -> database "Lee/escribe"

        # Nivel despliegue
        deploymentEnvironment "Produccion" {
            deploymentNode "Telefono del paciente" "Dispositivo del usuario." "Android" {
                containerInstance mobile
            }
            deploymentNode "Render" "PaaS (free tier)." "Render.com" {
                deploymentNode "Web Service" "Contenedor del API." "Docker" {
                    containerInstance api
                }
                deploymentNode "Background Worker" "Proceso del scheduler." "Docker" {
                    containerInstance worker
                }
            }
            deploymentNode "Supabase Cloud" "BaaS: Postgres, Storage y Auth." "Supabase" {
                containerInstance database
            }
        }
    }

    views {
        systemContext puntualmed "Contexto" "Nivel 1: contexto del sistema PuntualMed." {
            include *
            autolayout lr
        }

        container puntualmed "Contenedores" "Nivel 2: contenedores que componen PuntualMed." {
            include *
            autolayout lr
        }

        component api "Componentes_API" "Nivel 3: modulos de dominio del backend." {
            include *
            autolayout lr
        }

        dynamic puntualmed "FlujoTomaConfirmada" "Flujo: recordatorio y confirmacion de la toma." {
            worker -> database "Detecta tomas pendientes cuyo horario llego"
            worker -> expo "Solicita el envio del recordatorio"
            expo -> mobile "Entrega la notificacion push al paciente"
            patient -> mobile "Confirma la toma con una foto"
            mobile -> api "POST /intakes/{id}/confirm con la foto"
            api -> database "Marca la toma como tomada y guarda la foto"
            autolayout lr
        }

        dynamic puntualmed "FlujoAlertaFamiliar" "Flujo: toma perdida y alerta al familiar." {
            worker -> database "Detecta tomas pendientes cuyo horario llego"
            worker -> expo "Solicita el envio del recordatorio"
            expo -> mobile "Entrega la notificacion push al paciente"
            worker -> database "Tras el plazo de gracia marca la toma como perdida"
            worker -> telegram "Envia la alerta de toma perdida"
            telegram -> caregiver "Notifica al familiar de seguimiento"
            autolayout lr
        }

        deployment puntualmed "Produccion" "Despliegue" "Despliegue en produccion (free tier)." {
            include *
            autolayout lr
        }

        styles {
            element "Element" {
                color #ffffff
            }
            element "Person" {
                background #1E3A8A
                shape Person
            }
            element "Software System" {
                background #1E3A8A
            }
            element "Container" {
                background #38BDF8
                color #0b1324
            }
            element "Component" {
                background #34D399
                color #0b1324
            }
            element "External" {
                background #9CA3AF
                color #111827
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}
