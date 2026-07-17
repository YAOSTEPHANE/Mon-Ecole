export type FneCycle = 'secondary' | 'primary';
export type FneYearOption = {
    value: string;
    label: string;
};
export type FneSchoolOption = {
    id: string;
    name: string;
};
export type FneLookupResult = {
    fullName: string;
    matricule: string;
    dateOfBirth: string | null;
    birthPlace: string | null;
    father: string | null;
    mother: string | null;
    establishment: string | null;
    establishmentCode: string | null;
    fileYear: string;
};
export type FneLookupResponse = {
    cycle: FneCycle;
    query: {
        annee: string;
        nom: string;
        prenoms: string;
        datenaiss: string;
        etablissement: string;
    };
    results: FneLookupResult[];
    truncated: boolean;
    sourceUrl: string;
    note: string | null;
};
export declare function parseFneSearchResults(html: string, fileYear: string): FneLookupResult[];
/** Convertit une date ISO (yyyy-mm-dd) ou déjà dd-mm-yyyy vers le format du portail FNE. */
export declare function toFneDateFormat(raw: string | null | undefined): string;
export declare function getFneFormOptions(cycle?: FneCycle): Promise<{
    cycle: FneCycle;
    years: FneYearOption[];
    schools: FneSchoolOption[];
    formUrl: string;
}>;
export declare function searchFneMatricule(input: {
    cycle?: FneCycle;
    annee: string;
    nom: string;
    prenoms?: string;
    datenaiss?: string;
    etablissement?: string;
}): Promise<FneLookupResponse>;
export declare function findSchoolOption(schools: FneSchoolOption[], schoolCode: string | null | undefined, schoolNameHint?: string | null): FneSchoolOption | null;
//# sourceMappingURL=fne-matricule-search.util.d.ts.map