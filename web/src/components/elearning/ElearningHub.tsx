import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  elearningApi,
  uploadElearningFile,
  type ElearningLessonKind,
  type PedagogicalResourceKind,
} from '../../services/api/elearning.api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FiBookOpen,
  FiVideo,
  FiFileText,
  FiHelpCircle,
  FiLink,
  FiPlus,
  FiMonitor,
  FiDatabase,
  FiCheckCircle,
  FiUpload,
  FiExternalLink,
} from 'react-icons/fi';

type HubMode = 'teacher' | 'student' | 'admin';

const LESSON_KIND_LABELS: Record<ElearningLessonKind, string> = {
  VIDEO: 'Vidéo',
  DOCUMENT: 'Document',
  EXERCISE: 'Exercice',
  QUIZ: 'Quiz',
  EXTERNAL_LINK: 'Lien externe',
  HOMEWORK: 'Devoir en ligne',
};

const RESOURCE_KIND_LABELS: Record<PedagogicalResourceKind, string> = {
  DOCUMENT: 'Document',
  VIDEO: 'Vidéo',
  AUDIO: 'Audio',
  IMAGE: 'Image',
  EXTERNAL_LINK: 'Lien externe',
  MULTIMEDIA: 'Multimédia',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Planifiée',
  LIVE: 'En direct',
  ENDED: 'Terminée',
  CANCELLED: 'Annulée',
};

type SectionId = 'platform' | 'virtual' | 'resources';

export default function ElearningHub({ mode }: { mode: HubMode }) {
  const canEdit = mode === 'teacher' || mode === 'admin';
  const queryClient = useQueryClient();
  const [section, setSection] = useState<SectionId>('platform');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    subject: '',
    level: '',
    isPublished: false,
  });
  const [lessonForm, setLessonForm] = useState({
    title: '',
    kind: 'VIDEO' as ElearningLessonKind,
    externalUrl: '',
    body: '',
    fileUrl: '',
    passingScore: 50,
    questionPrompt: '',
    questionOptions: 'A\nB\nC\nD',
    correctAnswer: 'A',
  });
  const [sessionForm, setSessionForm] = useState({
    title: '',
    scheduledStart: '',
    durationMinutes: 60,
    meetingUrl: '',
    whiteboardUrl: '',
    recordingUrl: '',
    chatEnabled: true,
    breakoutRoomsNotes: '',
  });
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    kind: 'DOCUMENT' as PedagogicalResourceKind,
    subject: '',
    level: '',
    externalUrl: '',
    fileUrl: '',
    sharedWithTeachers: true,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['elearning-courses'],
    queryFn: elearningApi.listCourses,
  });

  const { data: courseDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['elearning-course', selectedCourseId],
    queryFn: () => elearningApi.getCourse(selectedCourseId!),
    enabled: !!selectedCourseId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['elearning-sessions'],
    queryFn: elearningApi.listVirtualSessions,
    enabled: section === 'virtual',
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['elearning-resources'],
    queryFn: () => elearningApi.listResourceBank(),
    enabled: section === 'resources',
  });

  const invalidateCourses = () => {
    queryClient.invalidateQueries({ queryKey: ['elearning-courses'] });
    if (selectedCourseId) {
      queryClient.invalidateQueries({ queryKey: ['elearning-course', selectedCourseId] });
    }
  };

  const createCourseMut = useMutation({
    mutationFn: () => elearningApi.createCourse(courseForm),
    onSuccess: () => {
      toast.success('Parcours créé');
      setShowCourseModal(false);
      invalidateCourses();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishCourseMut = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      elearningApi.updateCourse(id, { isPublished }),
    onSuccess: () => {
      toast.success('Parcours mis à jour');
      invalidateCourses();
    },
  });

  const createLessonMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: lessonForm.title,
        kind: lessonForm.kind,
        externalUrl: lessonForm.externalUrl || null,
        body: lessonForm.body || null,
        fileUrl: lessonForm.fileUrl || null,
      };
      if (lessonForm.kind === 'QUIZ') {
        const options = lessonForm.questionOptions
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean);
        payload.questions = [
          {
            kind: 'MCQ',
            prompt: lessonForm.questionPrompt,
            options,
            correctAnswer: lessonForm.correctAnswer,
            points: 1,
          },
        ];
        payload.passingScore = lessonForm.passingScore;
      }
      return elearningApi.createLesson(selectedCourseId!, payload);
    },
    onSuccess: () => {
      toast.success('Leçon ajoutée');
      setShowLessonModal(false);
      invalidateCourses();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitQuizMut = useMutation({
    mutationFn: (quizId: string) => elearningApi.submitQuizAttempt(quizId, quizAnswers),
    onSuccess: (data) => {
      const msg =
        data.passed === true
          ? `Quiz réussi (${data.score}/${data.maxScore})`
          : data.passed === false
            ? `Score : ${data.score}/${data.maxScore}`
            : 'Réponses enregistrées';
      toast.success(msg);
      setQuizAnswers({});
      invalidateCourses();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeLessonMut = useMutation({
    mutationFn: (lessonId: string) => elearningApi.completeLesson(lessonId),
    onSuccess: () => {
      toast.success('Leçon marquée comme terminée');
      invalidateCourses();
    },
  });

  const createSessionMut = useMutation({
    mutationFn: () => elearningApi.createVirtualSession(sessionForm),
    onSuccess: () => {
      toast.success('Session planifiée');
      setShowSessionModal(false);
      queryClient.invalidateQueries({ queryKey: ['elearning-sessions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createResourceMut = useMutation({
    mutationFn: () => elearningApi.createResource(resourceForm),
    onSuccess: () => {
      toast.success('Ressource ajoutée');
      setShowResourceModal(false);
      queryClient.invalidateQueries({ queryKey: ['elearning-resources'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sections = useMemo(
    () => [
      { id: 'platform' as const, label: '10.1 Plateforme', icon: FiBookOpen },
      { id: 'virtual' as const, label: '10.2 Classes virtuelles', icon: FiMonitor },
      { id: 'resources' as const, label: '10.3 Banque de ressources', icon: FiDatabase },
    ],
    [],
  );

  const handleFileUpload = async (file: File, target: 'lesson' | 'resource') => {
    try {
      const url = await uploadElearningFile(file);
      if (target === 'lesson') setLessonForm((f) => ({ ...f, fileUrl: url }));
      else setResourceForm((f) => ({ ...f, fileUrl: url }));
      toast.success('Fichier téléversé');
    } catch {
      toast.error('Échec du téléversement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                section === s.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/80 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {section === 'platform' && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Parcours</h3>
              {canEdit && (
                <Button size="sm" onClick={() => setShowCourseModal(true)}>
                  <FiPlus className="mr-1" /> Nouveau
                </Button>
              )}
            </div>
            {coursesLoading ? (
              <p className="text-sm text-slate-500">Chargement…</p>
            ) : courses.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun parcours pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {courses.map((c: { id: string; title: string; isPublished?: boolean; _count?: { lessons: number } }) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selectedCourseId === c.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700'
                      }`}
                    >
                      <div className="font-medium">{c.title}</div>
                      <div className="mt-1 flex gap-2">
                        {c.isPublished ? (
                          <Badge variant="success">Publié</Badge>
                        ) : (
                          <Badge variant="warning">Brouillon</Badge>
                        )}
                        <span className="text-xs text-slate-500">{c._count?.lessons ?? 0} leçons</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            {!selectedCourseId ? (
              <p className="text-slate-500">Sélectionnez un parcours pour afficher le contenu.</p>
            ) : detailLoading ? (
              <p className="text-slate-500">Chargement du parcours…</p>
            ) : courseDetail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{courseDetail.title}</h2>
                    {courseDetail.description && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{courseDetail.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {courseDetail.subject && <span>Matière : {courseDetail.subject}</span>}
                      {courseDetail.level && <span>Niveau : {courseDetail.level}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        publishCourseMut.mutate({
                          id: courseDetail.id,
                          isPublished: !courseDetail.isPublished,
                        })
                      }
                    >
                      {courseDetail.isPublished ? 'Dépublier' : 'Publier'}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Contenus pédagogiques</h3>
                  {canEdit && (
                    <Button size="sm" onClick={() => setShowLessonModal(true)}>
                      <FiPlus className="mr-1" /> Ajouter une leçon
                    </Button>
                  )}
                </div>

                <ul className="space-y-3">
                  {(courseDetail.lessons ?? []).map(
                    (lesson: {
                      id: string;
                      title: string;
                      kind: ElearningLessonKind;
                      fileUrl?: string | null;
                      externalUrl?: string | null;
                      body?: string | null;
                      quiz?: { id: string; questions: { id: string; prompt: string; options?: string[] }[] } | null;
                    }) => (
                      <li key={lesson.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              {lesson.kind === 'VIDEO' && <FiVideo className="text-indigo-500" />}
                              {lesson.kind === 'DOCUMENT' && <FiFileText className="text-blue-500" />}
                              {lesson.kind === 'QUIZ' && <FiHelpCircle className="text-amber-500" />}
                              {lesson.kind === 'EXTERNAL_LINK' && <FiLink className="text-teal-500" />}
                              <span className="font-medium">{lesson.title}</span>
                              <Badge>{LESSON_KIND_LABELS[lesson.kind]}</Badge>
                            </div>
                            {lesson.body && <p className="mt-2 text-sm text-slate-600">{lesson.body}</p>}
                            {lesson.fileUrl && (
                              <a
                                href={lesson.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600"
                              >
                                <FiExternalLink /> Ouvrir le support
                              </a>
                            )}
                            {lesson.externalUrl && (
                              <a
                                href={lesson.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600"
                              >
                                <FiExternalLink /> Lien externe
                              </a>
                            )}
                          </div>
                          {mode === 'student' && lesson.kind !== 'QUIZ' && (
                            <Button size="sm" variant="secondary" onClick={() => completeLessonMut.mutate(lesson.id)}>
                              <FiCheckCircle className="mr-1" /> Terminé
                            </Button>
                          )}
                        </div>

                        {mode === 'student' && lesson.kind === 'QUIZ' && lesson.quiz && (
                          <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                            {lesson.quiz.questions.map((q) => (
                              <div key={q.id}>
                                <p className="text-sm font-medium">{q.prompt}</p>
                                {Array.isArray(q.options) ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(q.options as string[]).map((opt) => (
                                      <label key={opt} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="radio"
                                          name={q.id}
                                          checked={quizAnswers[q.id] === opt}
                                          onChange={() => setQuizAnswers((a) => ({ ...a, [q.id]: opt }))}
                                        />
                                        {opt}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <input
                                    className="mt-2 w-full rounded border px-2 py-1 text-sm"
                                    value={quizAnswers[q.id] ?? ''}
                                    onChange={(e) => setQuizAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                  />
                                )}
                              </div>
                            ))}
                            <Button size="sm" onClick={() => submitQuizMut.mutate(lesson.quiz!.id)}>
                              Soumettre le quiz
                            </Button>
                          </div>
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {section === 'virtual' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Classes virtuelles</h3>
              <p className="text-sm text-slate-500">
                Visioconférence, partage d&apos;écran, tableau blanc et enregistrements via liens de réunion.
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setShowSessionModal(true)}>
                <FiPlus className="mr-1" /> Planifier
              </Button>
            )}
          </div>
          <ul className="space-y-3">
            {sessions.map(
              (s: {
                id: string;
                title: string;
                scheduledStart: string;
                durationMinutes: number;
                status: string;
                meetingUrl?: string | null;
                recordingUrl?: string | null;
                whiteboardUrl?: string | null;
                chatEnabled?: boolean;
                breakoutRoomsNotes?: string | null;
              }) => (
                <li key={s.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <p className="text-sm text-slate-500">
                        {format(new Date(s.scheduledStart), 'PPp', { locale: fr })} · {s.durationMinutes} min
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{SESSION_STATUS_LABELS[s.status] ?? s.status}</Badge>
                        {s.chatEnabled && <Badge variant="info">Chat activé</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.meetingUrl && (
                        <a href={s.meetingUrl} target="_blank" rel="noreferrer">
                          <Button size="sm">Rejoindre la visio</Button>
                        </a>
                      )}
                      {s.whiteboardUrl && (
                        <a href={s.whiteboardUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="secondary">
                            Tableau blanc
                          </Button>
                        </a>
                      )}
                      {s.recordingUrl && (
                        <a href={s.recordingUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="secondary">
                            Enregistrement
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  {s.breakoutRoomsNotes && (
                    <p className="mt-2 text-xs text-slate-500">Sous-groupes : {s.breakoutRoomsNotes}</p>
                  )}
                </li>
              ),
            )}
            {sessions.length === 0 && <p className="text-sm text-slate-500">Aucune session planifiée.</p>}
          </ul>
        </Card>
      )}

      {section === 'resources' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Banque de ressources pédagogiques</h3>
              <p className="text-sm text-slate-500">Partage entre enseignants, organisation par matière et niveau.</p>
            </div>
            {canEdit && (
              <Button onClick={() => setShowResourceModal(true)}>
                <FiPlus className="mr-1" /> Ajouter
              </Button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {resources.map(
              (r: {
                id: string;
                title: string;
                description?: string | null;
                kind: PedagogicalResourceKind;
                subject?: string | null;
                level?: string | null;
                fileUrl?: string | null;
                externalUrl?: string | null;
                sharedWithTeachers?: boolean;
              }) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-indigo-500" />
                    <span className="font-medium">{r.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <Badge>{RESOURCE_KIND_LABELS[r.kind]}</Badge>
                    {r.subject && <span className="text-slate-500">{r.subject}</span>}
                    {r.level && <span className="text-slate-500">{r.level}</span>}
                    {r.sharedWithTeachers && <Badge variant="info">Partagé</Badge>}
                  </div>
                  {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
                  <div className="mt-2 flex gap-2">
                    {r.fileUrl && (
                      <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">
                        Télécharger
                      </a>
                    )}
                    {r.externalUrl && (
                      <a href={r.externalUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">
                        Lien externe
                      </a>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
          {resources.length === 0 && <p className="text-sm text-slate-500">Aucune ressource dans la banque.</p>}
        </Card>
      )}

      <Modal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title="Nouveau parcours e-learning">
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Titre"
            value={courseForm.title}
            onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Description"
            rows={3}
            value={courseForm.description}
            onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Matière"
              value={courseForm.subject}
              onChange={(e) => setCourseForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Niveau"
              value={courseForm.level}
              onChange={(e) => setCourseForm((f) => ({ ...f, level: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={courseForm.isPublished}
              onChange={(e) => setCourseForm((f) => ({ ...f, isPublished: e.target.checked }))}
            />
            Publier immédiatement
          </label>
          <Button onClick={() => createCourseMut.mutate()} disabled={!courseForm.title.trim()}>
            Créer
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showLessonModal} onClose={() => setShowLessonModal(false)} title="Nouvelle leçon">
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Titre"
            value={lessonForm.title}
            onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
          />
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={lessonForm.kind}
            onChange={(e) => setLessonForm((f) => ({ ...f, kind: e.target.value as ElearningLessonKind }))}
          >
            {Object.entries(LESSON_KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="URL externe (vidéo, lien…)"
            value={lessonForm.externalUrl}
            onChange={(e) => setLessonForm((f) => ({ ...f, externalUrl: e.target.value }))}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-indigo-600">
            <FiUpload />
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'lesson')}
            />
            Téléverser un fichier
          </label>
          {lessonForm.fileUrl && <p className="truncate text-xs text-slate-500">{lessonForm.fileUrl}</p>}
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Contenu / consignes"
            rows={3}
            value={lessonForm.body}
            onChange={(e) => setLessonForm((f) => ({ ...f, body: e.target.value }))}
          />
          {lessonForm.kind === 'QUIZ' && (
            <>
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Question"
                value={lessonForm.questionPrompt}
                onChange={(e) => setLessonForm((f) => ({ ...f, questionPrompt: e.target.value }))}
              />
              <textarea
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Options (une par ligne)"
                rows={4}
                value={lessonForm.questionOptions}
                onChange={(e) => setLessonForm((f) => ({ ...f, questionOptions: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Bonne réponse"
                value={lessonForm.correctAnswer}
                onChange={(e) => setLessonForm((f) => ({ ...f, correctAnswer: e.target.value }))}
              />
            </>
          )}
          <Button onClick={() => createLessonMut.mutate()} disabled={!lessonForm.title.trim() || !selectedCourseId}>
            Ajouter
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} title="Planifier une classe virtuelle">
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Titre"
            value={sessionForm.title}
            onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="w-full rounded-lg border px-3 py-2"
            value={sessionForm.scheduledStart}
            onChange={(e) => setSessionForm((f) => ({ ...f, scheduledStart: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Lien visio (laisser vide = salle Jitsi auto)"
            value={sessionForm.meetingUrl}
            onChange={(e) => setSessionForm((f) => ({ ...f, meetingUrl: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Lien tableau blanc"
            value={sessionForm.whiteboardUrl}
            onChange={(e) => setSessionForm((f) => ({ ...f, whiteboardUrl: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Notes salles de sous-groupes"
            rows={2}
            value={sessionForm.breakoutRoomsNotes}
            onChange={(e) => setSessionForm((f) => ({ ...f, breakoutRoomsNotes: e.target.value }))}
          />
          <Button onClick={() => createSessionMut.mutate()} disabled={!sessionForm.title || !sessionForm.scheduledStart}>
            Planifier
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showResourceModal} onClose={() => setShowResourceModal(false)} title="Ressource pédagogique">
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Titre"
            value={resourceForm.title}
            onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))}
          />
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={resourceForm.kind}
            onChange={(e) => setResourceForm((f) => ({ ...f, kind: e.target.value as PedagogicalResourceKind }))}
          >
            {Object.entries(RESOURCE_KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Matière"
              value={resourceForm.subject}
              onChange={(e) => setResourceForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Niveau"
              value={resourceForm.level}
              onChange={(e) => setResourceForm((f) => ({ ...f, level: e.target.value }))}
            />
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Lien externe"
            value={resourceForm.externalUrl}
            onChange={(e) => setResourceForm((f) => ({ ...f, externalUrl: e.target.value }))}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-indigo-600">
            <FiUpload />
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'resource')}
            />
            Téléverser un fichier
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={resourceForm.sharedWithTeachers}
              onChange={(e) => setResourceForm((f) => ({ ...f, sharedWithTeachers: e.target.checked }))}
            />
            Partager avec les enseignants
          </label>
          <Button onClick={() => createResourceMut.mutate()} disabled={!resourceForm.title.trim()}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
