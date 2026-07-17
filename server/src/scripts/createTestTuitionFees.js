"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Script pour créer des frais de scolarité de test
 *
 * Ce script crée des frais de scolarité pour tous les étudiants actifs
 * avec différents statuts (payé, en attente, en retard)
 */
async function createTestTuitionFees() {
    try {
        console.log('🚀 Début de la création des frais de scolarité de test...\n');
        // Récupérer tous les étudiants actifs
        const students = await prisma_1.default.student.findMany({
            where: {
                isActive: true,
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (students.length === 0) {
            console.log('❌ Aucun étudiant actif trouvé. Veuillez créer des étudiants d\'abord.');
            return;
        }
        console.log(`📚 ${students.length} étudiant(s) trouvé(s)\n`);
        // Année scolaire actuelle
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const academicYear = currentMonth >= 8
            ? `${currentYear}-${currentYear + 1}`
            : `${currentYear - 1}-${currentYear}`;
        // Périodes possibles
        const periods = [
            'Trimestre 1',
            'Trimestre 2',
            'Trimestre 3',
            'Semestre 1',
            'Semestre 2',
            'Frais d\'inscription',
            'Frais de scolarité annuelle',
        ];
        // Montants possibles (en FCFA)
        const amounts = [50000, 75000, 100000, 125000, 150000, 200000, 250000];
        let createdCount = 0;
        let paidCount = 0;
        let pendingCount = 0;
        let overdueCount = 0;
        for (const student of students) {
            // Créer 2-4 frais par étudiant
            const numFees = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < numFees; i++) {
                const period = periods[Math.floor(Math.random() * periods.length)];
                const amount = amounts[Math.floor(Math.random() * amounts.length)];
                // Générer une date d'échéance
                const dueDate = new Date();
                const daysOffset = Math.floor(Math.random() * 90) - 30; // Entre -30 et +60 jours
                dueDate.setDate(dueDate.getDate() + daysOffset);
                // Déterminer le statut (30% payé, 50% en attente, 20% en retard)
                const statusRand = Math.random();
                let isPaid = false;
                let paidAt = null;
                if (statusRand < 0.3) {
                    // Frais payé
                    isPaid = true;
                    paidAt = new Date(dueDate);
                    paidAt.setDate(paidAt.getDate() - Math.floor(Math.random() * 30)); // Payé avant l'échéance
                    paidCount++;
                }
                else if (statusRand < 0.8) {
                    // Frais en attente
                    pendingCount++;
                }
                else {
                    // Frais en retard
                    overdueCount++;
                }
                // Vérifier si un frais similaire existe déjà
                const existingFee = await prisma_1.default.tuitionFee.findFirst({
                    where: {
                        studentId: student.id,
                        academicYear,
                        period,
                    },
                });
                if (existingFee) {
                    console.log(`⏭️  Frais existant ignoré: ${student.user.firstName} ${student.user.lastName} - ${period}`);
                    continue;
                }
                // Créer le frais de scolarité
                const tuitionFee = await prisma_1.default.tuitionFee.create({
                    data: {
                        studentId: student.id,
                        academicYear,
                        period,
                        amount,
                        dueDate,
                        description: `Frais de scolarité pour ${period} - ${academicYear}`,
                        isPaid,
                        paidAt,
                    },
                });
                createdCount++;
                // Si le frais est payé, créer un paiement associé
                if (isPaid && paidAt) {
                    const paymentMethods = ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH'];
                    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                    await prisma_1.default.payment.create({
                        data: {
                            tuitionFeeId: tuitionFee.id,
                            studentId: student.id,
                            payerId: student.userId,
                            payerRole: 'STUDENT',
                            amount,
                            paymentMethod: paymentMethod,
                            status: 'COMPLETED',
                            paymentReference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            paidAt,
                        },
                    });
                }
                const status = isPaid ? '✅ Payé' : dueDate < new Date() ? '🔴 En retard' : '🟡 En attente';
                console.log(`✓ ${status} - ${student.user.firstName} ${student.user.lastName}: ${period} - ${amount.toLocaleString('fr-FR')} FCFA`);
            }
        }
        console.log('\n📊 Résumé:');
        console.log(`   Total créé: ${createdCount} frais`);
        console.log(`   ✅ Payés: ${paidCount}`);
        console.log(`   🟡 En attente: ${pendingCount}`);
        console.log(`   🔴 En retard: ${overdueCount}`);
        console.log(`\n✨ Création des frais de scolarité terminée avec succès !`);
    }
    catch (error) {
        console.error('❌ Erreur lors de la création des frais de scolarité:', error);
        throw error;
    }
    finally {
        await prisma_1.default.$disconnect();
    }
}
// Exécuter le script
if (require.main === module) {
    createTestTuitionFees()
        .then(() => {
        console.log('\n✅ Script terminé avec succès');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Erreur lors de l\'exécution du script:', error);
        process.exit(1);
    });
}
exports.default = createTestTuitionFees;
//# sourceMappingURL=createTestTuitionFees.js.map