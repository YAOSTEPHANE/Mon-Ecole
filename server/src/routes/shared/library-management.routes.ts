import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../../utils/prisma';
import { searchLibraryBorrowers } from '../../utils/library-borrower-search.util';
import { createLibraryLoansBatch } from '../../utils/library-create-loans.util';
import type { AuthRequest } from '../../middleware/auth.middleware';
import {
  resourceSchoolScopeWhere,
  type SchoolContextRequest,
} from '../../utils/school-context.util';

const router = express.Router();

router.get('/library/books', async (req, res) => {
  try {
    const { search, category, isActive } = req.query;
    const schoolReq = req as SchoolContextRequest;
    const andClauses: Record<string, unknown>[] = [];
    if (isActive === 'false') {
      andClauses.push({ isActive: false });
    } else if (isActive === 'all') {
      // pas de filtre isActive
    } else {
      andClauses.push({ isActive: true });
    }
    if (category && typeof category === 'string' && category.length > 0) {
      andClauses.push({ category });
    }
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      andClauses.push({
        OR: [
          { title: { contains: s } },
          { author: { contains: s } },
          { isbn: { contains: s } },
        ],
      });
    }
    if (schoolReq.schoolId) {
      andClauses.push(
        resourceSchoolScopeWhere(schoolReq.schoolId, schoolReq.school?.isDefault ?? false),
      );
    }
    const books = await prisma.libraryBook.findMany({
      where: andClauses.length ? { AND: andClauses } : {},
      orderBy: { title: 'asc' },
    });
    res.json(books);
  } catch (error: unknown) {
    console.error('GET /library/books:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.post(
  '/library/books',
  [
    body('title').notEmpty().withMessage('Titre requis'),
    body('author').notEmpty().withMessage('Auteur requis'),
    body('copiesTotal').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const schoolReq = req as SchoolContextRequest;
      const {
        isbn,
        title,
        author,
        publisher,
        publicationYear,
        category,
        description,
        copiesTotal,
        copiesAvailable,
        shelfLocation,
      } = req.body;
      const total = copiesTotal != null ? parseInt(String(copiesTotal), 10) : 1;
      const avail =
        copiesAvailable != null ? parseInt(String(copiesAvailable), 10) : total;
      if (avail < 0 || avail > total) {
        return res.status(400).json({ error: 'Exemplaires disponibles incohérents avec le total' });
      }
      const book = await prisma.libraryBook.create({
        data: {
          isbn: isbn?.trim() || null,
          title: String(title).trim(),
          author: String(author).trim(),
          publisher: publisher?.trim() || null,
          publicationYear:
            publicationYear != null && publicationYear !== ''
              ? parseInt(String(publicationYear), 10)
              : null,
          category: category?.trim() || null,
          description: description?.trim() || null,
          copiesTotal: total,
          copiesAvailable: avail,
          shelfLocation: shelfLocation?.trim() || null,
          schoolId: schoolReq.schoolId ?? null,
        },
      });
      res.status(201).json(book);
    } catch (error: unknown) {
      console.error('POST /library/books:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
  },
);

router.put('/library/books/:id', async (req, res) => {
  try {
    const {
      isbn,
      title,
      author,
      publisher,
      publicationYear,
      category,
      description,
      copiesTotal,
      copiesAvailable,
      shelfLocation,
      isActive,
    } = req.body;
    const existing = await prisma.libraryBook.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Livre introuvable' });
    }
    const data: Record<string, unknown> = {};
    if (isbn !== undefined) data.isbn = isbn === null || isbn === '' ? null : String(isbn).trim();
    if (title !== undefined) data.title = String(title).trim();
    if (author !== undefined) data.author = String(author).trim();
    if (publisher !== undefined) data.publisher = publisher?.trim() || null;
    if (publicationYear !== undefined) {
      data.publicationYear =
        publicationYear === null || publicationYear === ''
          ? null
          : parseInt(String(publicationYear), 10);
    }
    if (category !== undefined) data.category = category?.trim() || null;
    if (description !== undefined) data.description = description?.trim() || null;
    if (shelfLocation !== undefined) data.shelfLocation = shelfLocation?.trim() || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (copiesTotal !== undefined) {
      data.copiesTotal = parseInt(String(copiesTotal), 10);
    }
    if (copiesAvailable !== undefined) {
      data.copiesAvailable = parseInt(String(copiesAvailable), 10);
    }
    if (data.copiesTotal != null && data.copiesAvailable != null) {
      if ((data.copiesAvailable as number) < 0 || (data.copiesAvailable as number) > (data.copiesTotal as number)) {
        return res.status(400).json({ error: 'Exemplaires disponibles incohérents' });
      }
    } else if (data.copiesTotal != null) {
      const nextTotal = data.copiesTotal as number;
      const diff = nextTotal - existing.copiesTotal;
      data.copiesAvailable = Math.max(0, existing.copiesAvailable + diff);
      if ((data.copiesAvailable as number) > nextTotal) {
        data.copiesAvailable = nextTotal;
      }
    }
    const book = await prisma.libraryBook.update({
      where: { id: req.params.id },
      data,
    });
    res.json(book);
  } catch (error: unknown) {
    console.error('PUT /library/books/:id:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.delete('/library/books/:id', async (req, res) => {
  try {
    const activeLoans = await prisma.libraryLoan.count({
      where: { bookId: req.params.id, status: 'ACTIVE' },
    });
    if (activeLoans > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer : emprunts actifs sur cet ouvrage',
      });
    }
    await prisma.libraryBook.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error('DELETE /library/books/:id:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.get('/library/borrowers/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    const borrowers = await searchLibraryBorrowers(q);
    res.json(borrowers);
  } catch (error: unknown) {
    console.error('GET /library/borrowers/search:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.post('/library/loans/batch', async (req: AuthRequest, res) => {
  try {
    const { bookIds, borrowerId, dueDate, notes } = req.body ?? {};
    if (!Array.isArray(bookIds) || bookIds.length === 0 || !borrowerId || !dueDate) {
      return res.status(400).json({ error: 'bookIds (tableau), borrowerId et dueDate sont requis' });
    }
    const actorId = req.user?.id ?? null;
    const loans = await createLibraryLoansBatch({
      bookIds: bookIds.map(String),
      borrowerId: String(borrowerId),
      dueDate: new Date(dueDate),
      notes: typeof notes === 'string' ? notes : null,
      createdById: actorId,
    });
    const ids = loans.map((l) => l.id);
    const full = await prisma.libraryLoan.findMany({
      where: { id: { in: ids } },
      include: {
        book: true,
        borrower: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });
    res.status(201).json({ loans: full, count: full.length });
  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    if (err.status && err.status !== 500) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('POST /library/loans/batch:', error);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.get('/library/loans', async (req, res) => {
  try {
    const { status } = req.query;
    const where: Record<string, unknown> = {};
    if (status === 'ACTIVE' || status === 'RETURNED') {
      where.status = status;
    }
    const loans = await prisma.libraryLoan.findMany({
      where,
      include: {
        book: true,
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { loanedAt: 'desc' },
    });
    const now = new Date();
    const enriched = loans.map((l) => ({
      ...l,
      isOverdue:
        l.status === 'ACTIVE' && l.returnedAt == null && new Date(l.dueDate) < now,
    }));
    res.json(enriched);
  } catch (error: unknown) {
    console.error('GET /library/loans:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.post(
  '/library/loans',
  [body('bookId').notEmpty(), body('borrowerId').notEmpty(), body('dueDate').isISO8601()],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { bookId, borrowerId, dueDate, notes } = req.body;
      const actorId = req.user?.id;

      const result = await prisma.$transaction(async (tx) => {
        const book = await tx.libraryBook.findUnique({ where: { id: bookId } });
        if (!book || !book.isActive) {
          throw Object.assign(new Error('Livre introuvable ou inactif'), { status: 404 });
        }
        if (book.copiesAvailable < 1) {
          throw Object.assign(new Error('Aucun exemplaire disponible'), { status: 400 });
        }
        const borrower = await tx.user.findUnique({ where: { id: borrowerId } });
        if (!borrower) {
          throw Object.assign(new Error('Utilisateur introuvable'), { status: 404 });
        }
        const loan = await tx.libraryLoan.create({
          data: {
            bookId,
            borrowerId,
            dueDate: new Date(dueDate),
            notes: notes?.trim() || null,
            createdById: actorId || null,
            status: 'ACTIVE',
          },
        });
        await tx.libraryBook.update({
          where: { id: bookId },
          data: { copiesAvailable: { decrement: 1 } },
        });
        return loan;
      });

      const full = await prisma.libraryLoan.findUnique({
        where: { id: result.id },
        include: {
          book: true,
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });
      res.status(201).json(full);
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      const code = err.status || 500;
      if (code !== 500) {
        return res.status(code).json({ error: err.message });
      }
      console.error('POST /library/loans:', error);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  },
);

router.patch('/library/loans/:id/return', async (req, res) => {
  try {
    const loan = await prisma.libraryLoan.findUnique({
      where: { id: req.params.id },
      include: { book: true },
    });
    if (!loan) {
      return res.status(404).json({ error: 'Emprunt introuvable' });
    }
    if (loan.status === 'RETURNED') {
      return res.status(400).json({ error: 'Déjà retourné' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.libraryLoan.update({
        where: { id: loan.id },
        data: {
          status: 'RETURNED',
          returnedAt: new Date(),
        },
      });
      await tx.libraryBook.update({
        where: { id: loan.bookId },
        data: { copiesAvailable: { increment: 1 } },
      });
      const nextRes = await tx.libraryReservation.findFirst({
        where: { bookId: loan.bookId, status: 'PENDING' },
        orderBy: { reservedAt: 'asc' },
      });
      if (nextRes) {
        const exp = new Date();
        exp.setDate(exp.getDate() + 7);
        await tx.libraryReservation.update({
          where: { id: nextRes.id },
          data: { status: 'READY', expiresAt: exp },
        });
      }
    });
    const updated = await prisma.libraryLoan.findUnique({
      where: { id: req.params.id },
      include: {
        book: true,
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error('PATCH /library/loans/:id/return:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.get('/library/reservations', async (req, res) => {
  try {
    const { status } = req.query;
    const where: Record<string, unknown> = {};
    if (
      status &&
      typeof status === 'string' &&
      ['PENDING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED'].includes(status)
    ) {
      where.status = status;
    }
    const list = await prisma.libraryReservation.findMany({
      where,
      include: {
        book: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { reservedAt: 'desc' },
    });
    res.json(list);
  } catch (error: unknown) {
    console.error('GET /library/reservations:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.post(
  '/library/reservations',
  [body('bookId').notEmpty(), body('userId').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { bookId, userId } = req.body;
      const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
      if (!book || !book.isActive) {
        return res.status(404).json({ error: 'Livre introuvable' });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      const dup = await prisma.libraryReservation.findFirst({
        where: {
          bookId,
          userId,
          status: { in: ['PENDING', 'READY'] },
        },
      });
      if (dup) {
        return res.status(400).json({ error: 'Réservation déjà en cours pour ce livre' });
      }
      const resv = await prisma.libraryReservation.create({
        data: {
          bookId,
          userId,
          status: 'PENDING',
        },
        include: {
          book: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });
      res.status(201).json(resv);
    } catch (error: unknown) {
      console.error('POST /library/reservations:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
  },
);

router.patch('/library/reservations/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (
      !['PENDING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED'].includes(status)
    ) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const data: Record<string, unknown> = { status };
    if (status === 'FULFILLED') {
      data.fulfilledAt = new Date();
    }
    const resv = await prisma.libraryReservation.update({
      where: { id: req.params.id },
      data,
      include: {
        book: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
    res.json(resv);
  } catch (error: unknown) {
    console.error('PATCH /library/reservations/:id:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.get('/library/penalties', async (req, res) => {
  try {
    const { paid } = req.query;
    const where: Record<string, unknown> = {};
    if (paid === 'true') {
      where.paid = true;
    } else if (paid === 'false') {
      where.paid = false;
    }
    const list = await prisma.libraryPenalty.findMany({
      where,
      include: {
        loan: { include: { book: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (error: unknown) {
    console.error('GET /library/penalties:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.post(
  '/library/penalties',
  [body('userId').notEmpty(), body('amount').isFloat({ min: 0 }), body('reason').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { loanId, userId, amount, reason, notes } = req.body;
      const pen = await prisma.libraryPenalty.create({
        data: {
          loanId: loanId || null,
          userId,
          amount: parseFloat(String(amount)),
          reason: String(reason).trim(),
          notes: notes?.trim() || null,
        },
        include: {
          loan: { include: { book: true } },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });
      res.status(201).json(pen);
    } catch (error: unknown) {
      console.error('POST /library/penalties:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
  },
);

router.patch('/library/penalties/:id', async (req, res) => {
  try {
    const { paid, waived, notes } = req.body;
    const data: Record<string, unknown> = {};
    if (paid === true) {
      data.paid = true;
      data.paidAt = new Date();
    }
    if (waived === true) {
      data.waived = true;
    }
    if (notes !== undefined) {
      data.notes = notes === null || notes === '' ? null : String(notes).trim();
    }
    const pen = await prisma.libraryPenalty.update({
      where: { id: req.params.id },
      data,
      include: {
        loan: { include: { book: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
    res.json(pen);
  } catch (error: unknown) {
    console.error('PATCH /library/penalties/:id:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

export default router;
