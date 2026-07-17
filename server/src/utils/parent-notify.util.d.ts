import { type ImportantEmailTemplate } from './notify-important.util';
/** Identifiants utilisateurs des parents liés à un élève. */
export declare function getParentUserIdsForStudent(studentId: string): Promise<string[]>;
/** Notifie tous les parents d’un élève (sans doublon). */
export declare function notifyParentsForStudent(studentId: string, options: {
    type: string;
    title: string;
    content: string;
    link?: string;
    email?: ImportantEmailTemplate | null;
}): Promise<void>;
/** Notifie les parents de plusieurs élèves (ex. devoir de classe). */
export declare function notifyParentsForStudents(studentIds: string[], options: {
    type: string;
    title: string;
    content: string;
    link?: string;
    email?: ImportantEmailTemplate | null;
}): Promise<void>;
/** Après déclaration espèces (parent ou élève) — accusé aux parents. */
export declare function notifyParentCashPaymentSubmitted(paymentId: string): Promise<void>;
/** Après validation espèces par l’économat. */
export declare function notifyParentCashPaymentValidated(paymentId: string): Promise<void>;
/** Après refus d’une déclaration espèces. */
export declare function notifyParentCashPaymentRejected(paymentId: string, reason?: string): Promise<void>;
/** Nouveau devoir publié pour une classe. */
export declare function notifyParentsNewAssignment(params: {
    studentIds: string[];
    title: string;
    courseName: string;
    dueDate: Date;
}): Promise<void>;
/** Nouvelle note visible (enseignant / validation). */
export declare function notifyParentsNewGrade(params: {
    studentId: string;
    courseName: string;
    score: number;
    maxScore?: number | null;
}): Promise<void>;
//# sourceMappingURL=parent-notify.util.d.ts.map