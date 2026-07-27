import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import NFCScanner from '../ui/NFCScanner';
import ExternalNFCReceiver from '../ui/ExternalNFCReceiver';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { FiUser, FiMail, FiPhone, FiBook, FiCalendar, FiCheckCircle, FiXCircle, FiBriefcase, FiWifi } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { formatFCFA } from '../../utils/currency';

const NFCTeacherScanner: React.FC = () => {
  const queryClient = useQueryClient();
  const [scannedNFCId, setScannedNFCId] = useState<string | null>(null);
  const [autoRecordStatus, setAutoRecordStatus] = useState<'PRESENT' | 'LATE'>('PRESENT');
  const [useExternalDevice, setUseExternalDevice] = useState(false);

  // Rechercher l'enseignant par NFC ID
  const { data: teacher, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-nfc', scannedNFCId],
    queryFn: () => adminApi.getTeacherByNFC(scannedNFCId!),
    enabled: !!scannedNFCId,
    retry: false,
  });

  // Mutation pour enregistrer automatiquement la présence
  const recordAttendanceMutation = useMutation({
    mutationFn: (data: {
      teacherId: string;
      date: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    }) => adminApi.recordTeacherNFCAttendance(data),
    onSuccess: (data) => {
      const att = data.attendance;
      const teacherName =
        att?.teacher?.user?.firstName != null && att?.teacher?.user?.lastName != null
          ? `${att.teacher.user.firstName} ${att.teacher.user.lastName}`
          : `${teacher?.user.firstName} ${teacher?.user.lastName}`;
      const statusLabels: Record<string, string> = {
        PRESENT: 'présent',
        LATE: 'en retard',
        ABSENT: 'absent',
        EXCUSED: 'excusé',
      };
      const statusText = statusLabels[att?.status] ?? att?.status ?? 'enregistré';
      toast.success(`${teacherName} marqué automatiquement comme ${statusText}`);
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-attendance'] });
      setScannedNFCId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
    },
  });

  // Enregistrer automatiquement la présence quand un enseignant est trouvé
  useEffect(() => {
    if (teacher && !isLoading && !error) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Si c'est après 8h30, considérer comme en retard
      const isLate = currentHour > 8 || (currentHour === 8 && currentMinute > 30);
      const status = isLate ? 'LATE' : autoRecordStatus;

      // Enregistrer automatiquement
      recordAttendanceMutation.mutate({
        teacherId: teacher.id,
        date: new Date().toISOString(),
        status,
      });
    }
  }, [teacher, isLoading, error, autoRecordStatus]);

  const handleScan = (nfcId: string) => {
    setScannedNFCId(nfcId);
    refetch();
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const handleClear = () => {
    setScannedNFCId(null);
  };

  // Vérifier si NFC est supporté
  const isNFCSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  // Gérer les scans depuis l'appareil externe
  useEffect(() => {
    if (useExternalDevice && scannedNFCId) {
      refetch();
    }
  }, [scannedNFCId, useExternalDevice, refetch]);

  return (
    <div className="space-y-6">
      {/* Options d'enregistrement automatique */}
      <Card className="bg-blue-50 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-900">Enregistrement automatique</p>
            <p className="text-sm text-blue-700">
              La présence sera enregistrée automatiquement lors du scan
            </p>
          </div>
          <select
            value={autoRecordStatus}
            onChange={(e) => setAutoRecordStatus(e.target.value as 'PRESENT' | 'LATE')}
            className="px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-sm font-medium text-blue-900"
          >
            <option value="PRESENT">Présent par défaut</option>
            <option value="LATE">En retard par défaut</option>
          </select>
        </div>
      </Card>

      {/* Option pour basculer entre scanner navigateur et appareil externe */}
      {!isNFCSupported && (
        <Card className="bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiWifi className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">NFC du navigateur non supporté</p>
                <p className="text-sm text-blue-700">
                  Utilisez un appareil NFC externe pour scanner les cartes
                </p>
              </div>
            </div>
            <button
              onClick={() => setUseExternalDevice(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              Activer Appareil Externe
            </button>
          </div>
        </Card>
      )}

      {isNFCSupported && (
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() => setUseExternalDevice(!useExternalDevice)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {useExternalDevice ? 'Utiliser Scanner Navigateur' : 'Utiliser Appareil Externe'}
          </button>
        </div>
      )}

      {!useExternalDevice ? (
        <NFCScanner
          onScan={handleScan}
          onError={handleError}
          className="w-full"
        />
      ) : (
        <ExternalNFCReceiver
          onScanReceived={(scanData) => {
            if (scanData && scanData.nfcId) {
              setScannedNFCId(scanData.nfcId);
            }
          }}
        />
      )}

      {/* Résultats du scan */}
      {scannedNFCId && (
        <Card className="w-full">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Résultat du scan</h3>
              <button
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Recherche de l'enseignant...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <FiXCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">Enseignant non trouvé</p>
                    <p className="text-sm text-red-700">
                      Aucun enseignant n'est associé à cet ID NFC: <span className="font-mono">{scannedNFCId}</span>
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      Assurez-vous que la carte NFC est correctement enregistrée dans le système.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {teacher && !isLoading && (
              <div className="space-y-4">
                {recordAttendanceMutation.isPending ? (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                      <div>
                        <p className="font-semibold text-yellow-900">Enregistrement en cours...</p>
                        <p className="text-sm text-yellow-700">
                          Enregistrement de la présence de {teacher.user.firstName} {teacher.user.lastName}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : recordAttendanceMutation.isSuccess ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <FiCheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">Présence enregistrée !</p>
                        <p className="text-sm text-green-700">
                          {teacher.user.firstName} {teacher.user.lastName} a été marqué comme présent
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <FiCheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">Enseignant trouvé !</p>
                        <p className="text-sm text-green-700">Enregistrement automatique en cours...</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informations de l'enseignant */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    <Avatar
                      src={teacher.user?.avatar}
                      name={`${teacher.user?.firstName} ${teacher.user?.lastName}`}
                      size="lg"
                    />
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-900">
                        {teacher.user?.firstName} {teacher.user?.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">ID Employé: {teacher.employeeId}</p>
                      {teacher.nfcId && (
                        <p className="text-xs text-gray-500 font-mono mt-1">Carte NFC : {teacher.nfcId}</p>
                      )}
                      {teacher.biometricId && (
                        <p className="text-xs text-gray-500 font-mono mt-1">Empreinte : {teacher.biometricId}</p>
                      )}
                    </div>
                    <Badge variant="info">
                      Enseignant
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Informations de contact */}
                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <FiUser className="w-4 h-4" />
                        <span>Informations personnelles</span>
                      </h5>
                      <div className="space-y-2 text-sm">
                        {teacher.user?.email && (
                          <div className="flex items-center space-x-2 text-gray-700">
                            <FiMail className="w-4 h-4 text-gray-400" />
                            <span>{teacher.user.email}</span>
                          </div>
                        )}
                        {teacher.user?.phone && (
                          <div className="flex items-center space-x-2 text-gray-700">
                            <FiPhone className="w-4 h-4 text-gray-400" />
                            <span>{teacher.user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-gray-700">
                          <FiBriefcase className="w-4 h-4 text-gray-400" />
                          <span>Spécialisation: {teacher.specialization}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-700">
                          <FiCalendar className="w-4 h-4 text-gray-400" />
                          <span>
                            Embauché le: {new Date(teacher.hireDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Informations professionnelles */}
                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <FiBook className="w-4 h-4" />
                        <span>Informations professionnelles</span>
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <FiBriefcase className="w-4 h-4 text-gray-400" />
                          <span>Type de contrat: {teacher.contractType}</span>
                        </div>
                        {teacher.salary && (
                          <div className="flex items-center space-x-2 text-gray-700">
                            <FiUser className="w-4 h-4 text-gray-400" />
                            <span>Salaire: {formatFCFA(teacher.salary)}</span>
                          </div>
                        )}
                        {teacher.classes && teacher.classes.length > 0 && (
                          <div className="text-gray-700">
                            <p className="font-medium mb-1">Classes:</p>
                            <div className="space-y-1">
                              {teacher.classes.map((cls: any) => (
                                <p key={cls.id} className="text-xs">
                                  {cls.name} - {cls.level}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default NFCTeacherScanner;

