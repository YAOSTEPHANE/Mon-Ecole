// Utilitaires de débogage pour la connexion

export const testConnection = async () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  
  console.log('🔍 Test de connexion au serveur...');
  console.log('📍 URL API:', API_URL);
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Test du health check...');
    const healthResponse = await fetch(`${API_URL.replace('/api', '')}/api/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Serveur accessible:', healthData);
    } else {
      console.error('❌ Serveur non accessible:', healthResponse.status);
      return false;
    }
    
    // Test 2: Test de connexion avec des identifiants de test
    console.log('\n2️⃣ Test de connexion...');
    const testEmail = 'admin@school.com';
    const testPassword = 'admin123';
    
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    
    console.log('📊 Statut de la réponse:', loginResponse.status);
    console.log('📋 Headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    const loginData = await loginResponse.json();
    console.log('📦 Données reçues:', loginData);
    
    if (loginResponse.ok) {
      console.log('✅ Connexion réussie!');
      console.log('🎫 Token reçu:', loginData.token ? 'Oui' : 'Non');
      console.log('👤 Utilisateur:', loginData.user?.email);
      return true;
    } else {
      console.error('❌ Erreur de connexion:', loginData);
      return false;
    }
  } catch (error: unknown) {
    console.error('❌ Erreur lors du test:', error);
    console.error('💡 Vérifiez que:');
    console.error('   - Le serveur backend est démarré (port 5000)');
    console.error('   - MongoDB est connecté');
    console.error('   - Les variables d\'environnement sont correctes');
    return false;
  }
};

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as Window & { testConnection?: typeof testConnection }).testConnection = testConnection;
}






