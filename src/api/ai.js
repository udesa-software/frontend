import apiClient from './client';

// Servicio mockeado y real del AI-service (BioMatch) para el frontend.
// Se puede alternar usando la variable de entorno EXPO_PUBLIC_USE_MOCK.

const MOCK_RECOMMENDATIONS = [
  {
    id: "a8b9c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d",
    username: "tomi.sanz",
    biography: "Estudiante de Ciencias de la Computación en 3er año. Me la paso programando proyectos propios en Python y TypeScript. Fanático de los videojuegos de estrategia y de ir a recitales de rock nacional. Busco gente piola para charlar de tech o armar algún laburito loco.",
  },
  {
    id: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
    username: "sofia_martinez",
    biography: "Estudiante de Psicología, cursando el 4to año. Súper empática y colaborativa. En mis tiempos libres me copa hacer yoga en el parque, meditación y hacer cerámica. Si querés charlar de salud mental, filosofía, o tomar un café de especialidad, mandame un mensajito.",
  },
  {
    id: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
    username: "facu.runner",
    biography: "Ingeniería Industrial. Me encanta la adrenalina del running competitivo, hacer natación y ciclismo. Muy metódico y enfocado en mis metas. También me gusta mucho cocinar pastas caseras para mis amigos. Busco gente con buena onda para salir a correr temprano por San Isidro.",
  },
  {
    id: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
    username: "lu.designer",
    biography: "Estudiante de Diseño Gráfico. Me encanta la pintura, la fotografía analógica y recorrer museos en CABA. Creo que la creatividad es curiosidad constante. También toco el piano cuando tengo tiempo. Hablemos de arte, tipografías y diseño.",
  },
  {
    id: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
    username: "javi.finanzas",
    biography: "Licenciatura en Finanzas en UdeSA. Emprendedor por naturaleza, obsesionado con las finanzas personales y la inteligencia artificial aplicada. Hago crossfit y me gustan los podcasts de economía. Si querés charlar de startups o ideas de negocio, hacé swipe right.",
  },
  {
    id: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
    username: "martu_comunicacion",
    biography: "Comunicación Social, me apasiona la escritura creativa, el cine independiente y debatir sobre política estudiantil. Relajada y muy conversadora, me encanta ir a recitales y descubrir bandas emergentes. Busco gente piola para debatir de pelis o tomar algo.",
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    username: "pedro.abogado",
    biography: "Estudiante de Derecho, 5to año. Apasionado por la lectura de novelas históricas e introspectivo. Hago senderismo los fines de semana para desconectar de los códigos civiles. También me gusta el jazz clásico. Busco armar un lindo grupo de debate.",
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    username: "gabi_mendoza",
    biography: "Estudiante de intercambio de España en Ciencias de la Computación. Amante del surf, la escalada en roca y los videojuegos. Me encanta viajar de mochilero y programar pequeños hackathons los fines de semana. ¡Vamos a tomar una caña y codear!",
  }
];

export const aiApi = {
  /**
   * Obtiene recomendaciones de amistad personalizadas comparando semánticamente
   * la biografía del usuario logueado con otros perfiles.
   * Si la variable EXPO_PUBLIC_USE_MOCK es true, se usará la data mockeada local.
   * @param {Object} currentUser El usuario actualmente logueado (solo necesario para el mock local).
   * @returns {Promise<Array>} Lista de perfiles recomendados.
   */
  getRecommendations: async (currentUser) => {
    // Usa mock SOLO si está explícitamente configurado como 'true'.
    // Si la variable no existe o tiene cualquier otro valor, se usa el backend real.
    const useMock = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

    if (useMock) {
      // --- MOCK ---
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!currentUser || !currentUser.biography || currentUser.biography.trim() === "") {
        const error = new Error("El usuario actual no tiene biografía registrada.");
        error.statusCode = 400;
        error.code = "MISSING_BIOGRAPHY";
        throw error;
      }

      return MOCK_RECOMMENDATIONS.filter(
        (rec) => rec.id !== currentUser.id && rec.username !== currentUser.username
      );
    } else {
      // --- REAL BACKEND ---
      try {
        const response = await apiClient.get('/ai/recommendations');
        return response.data;
      } catch (err) {
        if (err.response && err.response.data) {
          throw err.response.data;
        }
        throw err;
      }
    }
  }
};
