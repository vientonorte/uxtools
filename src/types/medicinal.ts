export interface MedicinalIdData {
  nombre: string;
  rut: string;
  fechaReceta: string;
  vigenciaMeses: 1 | 3 | 6 | 12;
  dosis: string;
  diagnostico: string;
  medicoTratante: string;
  organizacion: string;
  mostrarRut: boolean;
  mostrarDiagnostico: boolean;
  updatedAt: string;
}

export const MEDICINAL_STORAGE_KEY = 'medicinal-id-data';

export const MEDICINAL_DEFAULT: MedicinalIdData = {
  nombre: '',
  rut: '',
  fechaReceta: '',
  vigenciaMeses: 6,
  dosis: '',
  diagnostico: '',
  medicoTratante: '',
  organizacion: '',
  mostrarRut: false,
  mostrarDiagnostico: false,
  updatedAt: '',
};
