import { useCallback, useState } from "react";
import { Platform, ScrollView, Share, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAsync } from "@/lib/use-async";
import { createFamilyLink, deleteFamilyContact, listFamilyContacts } from "@/lib/family-api";
import type { FamilyContact, FamilyLink } from "@/lib/family-api";

// QRCode solo se monta en nativo; en web se omite para no romper el bundle.
let QRCode: React.ComponentType<{ value: string; size: number }> | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QRCode = require("react-native-qrcode-svg").default;
}

function ContactRow({ contact, onUnlink }: { contact: FamilyContact; onUnlink: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="gap-2">
      <Text className="font-semibold text-primary">{contact.display_name ?? "Familiar"}</Text>
      {confirming ? (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Confirmar" onPress={onUnlink} />
          </View>
          <View className="flex-1">
            <Button label="Cancelar" variant="secondary" onPress={() => setConfirming(false)} />
          </View>
        </View>
      ) : (
        <Button label="Desvincular" variant="secondary" onPress={() => setConfirming(true)} />
      )}
    </Card>
  );
}

function LinkSection({ link }: { link: FamilyLink }) {
  const { deep_link } = link;

  function share() {
    // Ignora el rechazo si el usuario cancela la hoja de compartir.
    Share.share({ message: deep_link }).catch(() => {});
  }

  return (
    <Card className="gap-3">
      <Text selectable className="font-sans text-primary">
        {deep_link}
      </Text>
      {QRCode ? <QRCode value={deep_link} size={180} /> : null}
      <Button label="Compartir" onPress={share} />
    </Card>
  );
}

export default function Family() {
  const { data: contacts, loading, error, reload } = useAsync(listFamilyContacts);
  const [link, setLink] = useState<FamilyLink | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function handleCreateLink() {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await createFamilyLink();
      setLink(result);
    } catch {
      setGenError("No se pudo generar el enlace");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUnlink(id: string) {
    await deleteFamilyContact(id);
    reload();
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-4 p-4">
      <ScreenHeader title="Familiares" />

      <Button
        label={generating ? "Generando..." : "Vincular familiar"}
        onPress={handleCreateLink}
        disabled={generating}
      />
      {genError ? <Text className="text-center text-danger">{genError}</Text> : null}

      {link ? <LinkSection link={link} /> : null}

      {loading ? <Text className="text-center font-sans text-muted">Cargando...</Text> : null}
      {error ? <Text className="text-center text-danger">No se pudo cargar</Text> : null}

      {contacts && contacts.length === 0 ? (
        <Text className="text-center font-sans text-muted">Aún no vinculaste familiares.</Text>
      ) : null}

      {(contacts ?? []).map((c) => (
        <ContactRow key={c.id} contact={c} onUnlink={() => handleUnlink(c.id)} />
      ))}
    </ScrollView>
  );
}
