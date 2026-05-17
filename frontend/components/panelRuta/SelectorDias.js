import theme from "../../constants/theme";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const T = theme.lightMode;

const DIAS = [
    { key: "lunes", label: "L" },
    { key: "martes", label: "M  " },
    { key: "miercoles", label: "M" },
    { key: "jueves", label: "J" },
    { key: "viernes", label: " V" },
    { key: "sabado", label: "S" },
    { key: "domingo", label: "D" }

]

const PRESETS = [
    {
        label: "Entre semana",
        valor: { lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false }
    },
    {
        label: "Todos los dias",
        valor: { lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: true, domingo: true }
    },
    {
        label: "fines de semana",
        valor: { lunes: false, martes: false, miercoles: false, jueves: false, viernes: false, sabado: true, domingo: true }
    }

]

const detectarPreset = (dias) => {
    return PRESETS.find(p =>
        DIAS.every(d => p.valor[d.key] === dias[d.key])
    )?.label ?? null;
};

const SelectorDias = ({ dias, setDias, error }) => {
    const presetActivo = detectarPreset(dias);

    const toggleDia = (key) => {
        const nuevo = { ...dias, [key]: !dias[key] };
        // Al menos un día debe quedar activo
        if (Object.values(nuevo).some(Boolean)) setDias(nuevo);
    };

    const aplicarPreset = (preset) => setDias({ ...preset.valor });
    return (
        <View style={s.contenedor}>
            {/* Presets rápidos */}
            <View style={s.presets}>
                {PRESETS.map(p => (
                    <TouchableOpacity
                        key={p.label}
                        style={[s.preset, presetActivo === p.label && s.presetActivo]}
                        onPress={() => aplicarPreset(p)}
                    >
                        <Text style={[s.presetTexto, presetActivo === p.label && s.presetTextoActivo]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Selector individual */}
            <View style={s.dias}>
                {DIAS.map(d => (
                    <TouchableOpacity
                        key={d.key}
                        style={[s.dia, dias[d.key] && s.diaActivo]}
                        onPress={() => toggleDia(d.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.diaTexto, dias[d.key] && s.diaTextoActivo]}>
                            {d.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {error && <Text style={s.error}>{error}</Text>}
        </View>
    );
};

const s = StyleSheet.create({
    contenedor: { marginBottom: 16 },
    presets: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 10,
        flexWrap: "wrap",
    },
    preset: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: T.border?.secondary ?? "#ccc",
        backgroundColor: T.background?.secondary ?? "#f5f5f5",
    },
    presetActivo: {
        backgroundColor: T.accent?.primary ?? "#1D4ED8",
        borderColor: T.accent?.primary ?? "#1D4ED8",
    },
    presetTexto: {
        fontSize: 12,
        color: T.text?.secondary ?? "#666",
    },
    presetTextoActivo: {
        color: "#fff",
        fontWeight: "500",
    },
    dias: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    dia: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 0.5,
        borderColor: T.border?.secondary ?? "#ccc",
        backgroundColor: T.background?.secondary ?? "#f5f5f5",
        alignItems: "center",
        justifyContent: "center",
    },
    diaActivo: {
        backgroundColor: T.accent?.primary ?? "#1D4ED8",
        borderColor: T.accent?.primary ?? "#1D4ED8",
    },
    diaTexto: {
        fontSize: 13,
        fontWeight: "500",
        color: T.text?.secondary ?? "#666",
    },
    diaTextoActivo: {
        color: "#fff",
    },
    error: {
        fontSize: 12,
        color: "#E24B4A",
        marginTop: 6,
    },
});

export default SelectorDias;