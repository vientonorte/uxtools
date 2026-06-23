/** URL pública de acceso directo para pacientes medicinales. */
export const MEDICINAL_PUBLIC_URL = 'https://vientonorte.github.io/uxtools/#/medicinal';

/**
 * Modos de QR según el momento del servicio:
 * - carnet: datos del paciente para validación offline (fiscalización hoy)
 * - activation: enlace de onboarding / distribución de la app
 * - daya-token: token criptográfico + API Daya (futuro)
 */
export type MedicinalQrMode = 'carnet' | 'activation' | 'daya-token';

/** Modo activo del QR impreso en el carnet. */
export const MEDICINAL_QR_MODE: MedicinalQrMode = 'carnet';

/** Origen previsto de los datos del carnet (autogestión hoy; convenios médicos después). */
export type MedicinalDataSource = 'autogestion' | 'medico-daya' | 'dispensario';

export const MEDICINAL_DATA_SOURCE_LABELS: Record<MedicinalDataSource, string> = {
  autogestion: 'Autogestión',
  'medico-daya': 'Médico · Fundación Daya',
  dispensario: 'Dispensario asociado',
};