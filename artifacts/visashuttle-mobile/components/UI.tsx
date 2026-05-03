import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
        },
        style as any,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  variant = "gradient",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "gradient" | "solid" | "ghost";
}) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const content = (
    <View style={styles.btnInner}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color="#fff" style={{ marginRight: 8 }} /> : null}
          <Text style={styles.btnText}>{title}</Text>
        </>
      )}
    </View>
  );

  if (variant === "ghost") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        style={[styles.btnBase, { backgroundColor: "transparent", opacity: isDisabled ? 0.5 : 1 }]}
        activeOpacity={0.8}
      >
        <View style={styles.btnInner}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              {icon ? <Feather name={icon} size={18} color={colors.primary} style={{ marginRight: 8 }} /> : null}
              <Text style={[styles.btnText, { color: colors.primary }]}>{title}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === "solid") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        style={[styles.btnBase, { backgroundColor: colors.foreground, opacity: isDisabled ? 0.5 : 1 }]}
        activeOpacity={0.85}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} disabled={isDisabled} activeOpacity={0.85} style={{ opacity: isDisabled ? 0.5 : 1 }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.btnBase}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
  testID,
  ...rest
}: {
  label?: string;
  error?: string;
} & TextInputProps) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground, marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        testID={testID}
        style={{
          borderWidth: 1,
          borderColor: error ? colors.destructive : colors.input,
          backgroundColor: colors.muted,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "ios" ? 14 : 10,
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
        }}
        {...rest}
      />
      {error ? (
        <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4, fontFamily: "Inter_400Regular" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Picker({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchable = true,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  searchable?: boolean;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!searchable || !q.trim()) return options;
    return options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  }, [options, q, searchable]);

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground, marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: colors.muted,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: value ? colors.foreground : colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {value || placeholder || "Select"}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
              paddingTop: 12,
            }}
          >
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground, flex: 1 }}>
                {label || "Select"}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {searchable ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search…"
                  placeholderTextColor={colors.mutedForeground}
                  style={{
                    backgroundColor: colors.muted,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: Platform.OS === "ios" ? 12 : 8,
                    fontFamily: "Inter_400Regular",
                    color: colors.foreground,
                  }}
                />
              </View>
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(it) => it}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                    setQ("");
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ flex: 1, fontFamily: "Inter_400Regular", color: colors.foreground, fontSize: 15 }}>
                    {item}
                  </Text>
                  {value === item ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>No results</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: color + "20",
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 26, color: colors.foreground }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
