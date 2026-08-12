/** Modèle CSV pour l’import d’élèves (séparateur ;). */
export const STUDENT_IMPORT_CSV_TEMPLATE = `N° élève;Nom;Prénom;Date naissance;Genre;Email;Mot de passe;Classe;Téléphone;Lieu naissance;Adresse;Contact urgence;Tél urgence;Matricule national
ELV001;Dupont;Alice;15/03/2012;F;alice.dupont@exemple.com;MotDePasse1!;6ème A;0600000001;Abidjan;;;;
ELV002;Koné;Ibrahim;22/07/2011;M;;MotDePasse1!;6ème A;0600000002;Bouaké;;;;
`;

export function downloadStudentImportTemplate() {
  const blob = new Blob(['\ufeff', STUDENT_IMPORT_CSV_TEMPLATE], {
    type: 'text/csv;charset=utf-8',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'modele-import-eleves.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function readCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}
