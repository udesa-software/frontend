/**
 * =============================================================================
 * API — SERVICIO DE UBICACIÓN
 * =============================================================================
 *
 * Encapsula todas las llamadas HTTP al microservicio de `location`,
 * que se expone a través del API Gateway en /api/locations.
 *
 * ENDPOINTS DISPONIBLES:
 *   POST /api/locations         → enviar ubicación actual del usuario
 *   POST /api/locations/friends → obtener ubicaciones de amigos + distancia
 *   PUT  /api/locations/label   → crear/actualizar etiqueta de lugar
 *   DELETE /api/locations/label → borrar etiqueta
 *   GET  /api/locations/privacy → obtener estado de modo privado
 *   PATCH /api/locations/privacy → actualizar estado de modo privado
 *   POST /api/locations/radar   → descubrir usuarios cercanos (no amigos)
 *
 * Todos los endpoints requieren autenticación (Bearer token JWT).
 * El token se inyecta automáticamente por el interceptor en `client.js`.
 * =============================================================================
 */

import apiClient from './client';

/**
 * Envía la ubicación GPS actual del usuario al servidor.
 *
 * El backend aplica rate limiting basado en la preferencia del usuario
 * (MIN_UPDATE_INTERVAL_SECONDS). Si se llama demasiado seguido, retorna 429.
 *
 * @param {Object} coords
 * @param {number} coords.latitude  - Latitud (-90 a 90)
 * @param {number} coords.longitude - Longitud (-180 a 180)
 * @param {number} [coords.locationUpdateFrequency] - Frecuencia preferida: 5, 15 o 30 (minutos)
 * @returns {Promise<Object>} Respuesta del servidor con la ubicación guardada
 */
export async function updateLocation({ latitude, longitude, locationUpdateFrequency }) {
  const body = { latitude, longitude };
  if (locationUpdateFrequency) {
    body.locationUpdateFrequency = locationUpdateFrequency;
  }
  const response = await apiClient.post('/locations', body);
  return response.data;
}

/**
 * Obtiene las ubicaciones de los amigos del usuario con la distancia
 * calculada desde la posición actual del usuario.
 *
 * Se usa POST (no GET) porque el cliente envía su propia posición en el body
 * para que el backend pueda calcular las distancias.
 *
 * @param {Object} coords
 * @param {number} coords.latitude  - Latitud actual del usuario
 * @param {number} coords.longitude - Longitud actual del usuario
 * @returns {Promise<Object>} Objeto con array 'friends'
 */
export async function getFriendsLocations({ latitude, longitude }) {
  const response = await apiClient.post('/locations/friends', { latitude, longitude });
  return response.data;
}

/**
 * Crea o actualiza una etiqueta textual de lugar manual
 * (ej: "en casa", "universidad", "trabajo").
 *
 * @param {string} label - Texto de la etiqueta (máx 30 caracteres)
 * @returns {Promise<Object>} Respuesta del servidor
 */
export async function updateLabel(label) {
  const response = await apiClient.put('/locations/label', { label });
  return response.data;
}

/**
 * Elimina la etiqueta de lugar del usuario.
 *
 * @returns {Promise<Object>} Respuesta del servidor
 */
export async function deleteLabel() {
  const response = await apiClient.delete('/locations/label');
  return response.data;
}

/**
 * Obtiene el estado de privacidad (modo fantasma) del usuario.
 *
 * @returns {Promise<Object>} { isPrivate: boolean }
 */
export async function getPrivacyStatus() {
  const response = await apiClient.get('/locations/privacy');
  return response.data;
}

/**
 * Actualiza el estado de privacidad del usuario.
 *
 * @param {boolean} isPrivate
 * @returns {Promise<Object>}
 */
export async function setPrivacyStatus(isPrivate) {
  const response = await apiClient.patch('/locations/privacy', { isPrivate });
  return response.data;
}

/**
 * Obtiene usuarios cercanos que no son amigos (Radar).
 *
 * @param {Object} coords
 * @param {number} coords.latitude
 * @param {number} coords.longitude
 * @returns {Promise<Object>} Objeto con array de usuarios cercanos
 */
export async function getRadar({ latitude, longitude }) {
  const response = await apiClient.post('/locations/radar', { latitude, longitude });
  return response.data;
}
