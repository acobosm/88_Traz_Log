const CONFIG = require("../src/config/config.js");

async function main() {
    console.log("Cargando inventario real (Nomenclatura ID-XXYYY) y personal...");

    // Se añade Consumo Nominal (ml por hora) para auditoría automática
    const resources = [
        // 1. Herramientas Manuales (Consumo nominal = 0)
        { id: "ID-HZ001", desc: "Herramienta de Zapa (Raspado)", consumo: 0 },
        { id: "ID-MA001", desc: "Machete de corte denso", consumo: 0 },
        { id: "ID-PL001", desc: "Herramienta Pulaski (Hacha/Azadón)", consumo: 0 },
        { id: "ID-MC001", desc: "Rastrillo McLeod (Suelo Mineral)", consumo: 0 },
        { id: "ID-BF001", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF002", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF003", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF004", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF005", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF006", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF007", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF008", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF009", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-BF010", desc: "Batefuego Forestal (Sofocación)", consumo: 0 },
        { id: "ID-PA001", desc: "Pala (Control de puntos calientes)", consumo: 0 },

        // 2. Equipos Motorizados (Con Consumo Nominal ml/h)
        { id: "ID-MB001", desc: "Motobomba Portátil Waterax Mark-3", consumo: 4 }, // 4L/h

        { id: "ID-MG001", desc: "Tramo de Manguera de Incendio 1.5 pulg", consumo: 0 },
        { id: "ID-MX001", desc: "Mochila de Agua (Bomba de Espalda 20L)", consumo: 0 },

        // 3. Vehículos y Logística
        { id: "ID-V4001", desc: "Vehículo 4x4 Transporte Brigada", consumo: 10 }, // 10L/h

        { id: "ID-AM001", desc: "Ambulancia Soporte Vital", consumo: 8 }, // 8L/h

        { id: "ID-TC001", desc: "Vehículo Cisterna (Tanquero) 2000G", consumo: 15 }, // 15L/h


        // 4. Comunicaciones y Comando
        { id: "ID-RD001", desc: "Radio Portátil Motorola DGP8550e", consumo: 0 },
        { id: "ID-GP001", desc: "GPS Garmin (Georreferenciación)", consumo: 0 },

        // 5. Equipo de Protección Individual (EPI)
        { id: "ID-CS001", desc: "Casco de Protección Forestal", consumo: 0 },
        { id: "ID-GT001", desc: "Guantes de Cuero Térmicos", consumo: 0 },
        { id: "ID-BT001", desc: "Botas de Combate Forestal", consumo: 0 },
        { id: "ID-MS001", desc: "Mascarilla Protección Respiratoria", consumo: 0 }
    ];

    console.log("Inventario preparado para carga inicial (Auditoría de Consumo habilitada):");
    resources.forEach(res => {
        const consumoTxt = res.consumo > 0 ? ` [Consumo: ${res.consumo} L/h]` : "";

        console.log(` - [${res.id}]: ${res.desc}${consumoTxt}`);
    });

    // En la Fase 3 se integrará con el despliegue automático
    console.log("\nTotal de ítems a registrar:", resources.length);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
