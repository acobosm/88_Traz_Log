# Análisis de Costos Operativos (Gas Report)

Este documento detalla los costos de ejecución de cada función del Smart Contract `TrazabilidadLogistica.sol` extrapolados a dinero real (**Dólar Americano - USD**), moneda oficial de Ecuador.

## Tabla de tamaño aproximado de cada función
╭--------------------------------------------------------------------+-----------------+--------+--------+--------+---------╮
| contracts/TrazabilidadLogistica.sol:TrazabilidadLogistica Contract |                 |        |        |        |         |
+===========================================================================================================================+
| Deployment Cost                                                    | Deployment Size |        |        |        |         |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| 3255170                                                            | 14943           |        |        |        |         |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
|                                                                    |                 |        |        |        |         |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| Function Name                                                      | Min             | Avg    | Median | Max    | # Calls |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| abrirEventoIncendio                                                | 27763           | 156924 | 171254 | 171374 | 10      |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| asignarInsumo                                                      | 37324           | 187598 | 217656 | 217656 | 6       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| brigadistas                                                        | 11472           | 11472  | 11472  | 11472  | 1       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| cerrarIncidente                                                    | 48050           | 53751  | 53751  | 59452  | 2       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| hasRole                                                            | 3187            | 3187   | 3187   | 3187   | 1       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| incendios                                                          | 17142           | 17142  | 17142  | 17142  | 2       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| inventario                                                         | 17945           | 17945  | 17945  | 17945  | 3       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| pause                                                              | 47396           | 53227  | 53227  | 59059  | 2       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| paused                                                             | 2584            | 2584   | 2584   | 2584   | 2       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| registrarHito                                                      | 150581          | 150599 | 150599 | 150617 | 2       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| registrarInsumo                                                    | 28482           | 118564 | 125735 | 145749 | 8       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| registrarPersonal                                                  | 62575           | 140278 | 142088 | 142100 | 44      |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| retornarInsumo                                                     | 43811           | 43939  | 43939  | 44068  | 2       |
|--------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| unpause                                                            | 25514           | 25514  | 25514  | 25514  | 1       |
╰--------------------------------------------------------------------+-----------------+--------+--------+--------+---------╯

## Parámetros de Cálculo
Para estos cálculos se han tomado valores de mercado estables para una red de Capa 1 (Ethereum):
- **Precio del Gas**: 20 Gwei (Típico en red descongestionada).
- **Valor del ETH**: $2,300 USD.
- **Fórmula**: `Costo_USD = (Gas_Usado * 20 * 10^-9) * 2,300`.

## 1. Matriz de Costos por Función

| Nombre de la Función | Gas (Avg) | Costo Est. (USD) | Responsable |
| :--- | :--- | :--- | :--- |
| **Despliegue Inicial** | **3,255,170** | **$149.74** | Admin / Institución |
| `registrarPersonal` | 140,278 | $6.45 | Administrador |
| `registrarInsumo` | 118,564 | $5.45 | Base Operativa |
| `abrirEventoIncendio` | 156,924 | $7.22 | Jefe de Escena |
| `asignarInsumo` | 187,598 | $8.63 | Jefe de Escena |
| `registrarHito` | 150,599 | $6.93 | Operador/Brigadista |
| `cerrarIncidente` | 53,751 | $2.47 | Jefe de Escena |
| `retornarInsumo` | 43,939 | $2.02 | Base Operativa |
| `pause` / `unpause` | ~40,000 | $1.84 | Administrador |

## 2. Escenarios de Operación Real (Combate Forestal)

### Escenario A: Movilización de un Recurso
*Apertura de incendio + Asignación de 1 Motobomba:*
- **Total Gas**: ~345,000.
- **Costo Total**: **$15.87 USD**.

### Escenario B: Registro de Actividad en Campo (Hito)
*Un brigadista reporta el estado de control de una línea de fuego:*
- **Total Gas**: 150,599.
- **Costo Total**: **$6.93 USD**.

## 3. Estrategias de Optimización para Reducción de Costos
Si el costo en Mainnet resulta prohibitivo para la escala del proyecto, se proponen las siguientes alternativas técnicas:
1. **Redes Layer 2 (L2)**: Desplegar en **Polygon** o **Optimism** reduciría estos costos en un **95% - 99%**, bajando un registro de hito de $6.93 a menos de **$0.10 USD**.
2. **Optimización de Almacenamiento**: El uso de `bytes32` en lugar de `string` para identificadores largos ya está implementado, lo que ahorra ~20k de gas por registro.
3. **Lecturas Gratuitas**: No existe costo de transacción para visualizar el inventario o el estado de un incendio a través de la DApp.

---
*Este reporte fue generado automáticamente mediante Foundry Gas Reporter.*
