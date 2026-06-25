import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../api/ai';
import { friendsApi } from '../api/friends';
import { colors, spacing, fontSizes, radii } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;
const ROTATION_FACTOR = 60; // velocidad de rotación al arrastrar

export function DiscoverScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [recommendations, setRecommendations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNoBio, setHasNoBio] = useState(false);
  
  // Mensaje temporario de Match (Toast)
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Valor animado para la posición del drag de la carta superior
  const position = useRef(new Animated.ValueXY()).current;

  // Ref mutable que siempre apunta al índice actual.
  // Necesario porque panResponder se crea UNA sola vez (useRef) y sus
  // callbacks capturan closures estáticas: sin este ref, currentIndex
  // siempre valdría 0 dentro del handler.
  const currentIndexRef = useRef(0);
  const recommendationsRef = useRef([]);
  const swipedUserIdsRef = useRef(new Set());

  // Resetear la posición de la carta DESPUÉS de que React confirma
  // el nuevo currentIndex en pantalla. Hacerlo antes causaría que
  // la carta reaparezcaa al centro durante un frame.
  useEffect(() => {
    currentIndexRef.current = currentIndex;
    position.stopAnimation();
    position.setValue({ x: 0, y: 0 });
  }, [currentIndex]);

  // Efecto para verificar la biografía del usuario actual cuando la pantalla toma foco
  useFocusEffect(
    React.useCallback(() => {
      if (!user.biography || user.biography.trim() === '') {
        setHasNoBio(true);
      } else {
        setHasNoBio(false);
        fetchRecommendations();
      }
    }, [user.biography])
  );

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const data = await aiApi.getRecommendations(user);
      const pendingRecommendations = data.filter((item) => !swipedUserIdsRef.current.has(item.id));
      recommendationsRef.current = pendingRecommendations;
      setRecommendations(pendingRecommendations);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      if (err.code === 'MISSING_BIOGRAPHY') {
        setHasNoBio(true);
      } else {
        Alert.alert('Error', 'No se pudieron obtener recomendaciones por biografía.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(''));
  };

  // Configuración del PanResponder para el gesto de swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe Derecha (Match / Conectar)
          forceSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe Izquierda (Pasar)
          forceSwipe('left');
        } else {
          // Resetear posición de la carta
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction) => {
    const xDest = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, {
      toValue: { x: xDest, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction) => {
    // Leer siempre desde el ref para evitar el problema de closure estática
    // del panResponder (que captura currentIndex=0 del primer render).
    const idx = currentIndexRef.current;
    const item = recommendationsRef.current[idx];
    if (item) {
      swipedUserIdsRef.current.add(item.id);
    }

    // Avanzar el índice: el useEffect se encargará de hacer stopAnimation
    // + setValue DESPUÉS de que React confirme el nuevo currentIndex,
    // evitando el flash donde la carta reaparece al centro.
    setCurrentIndex((prev) => prev + 1);

    if (direction === 'right' && item) {
      showToast(`¡Solicitud enviada a @${item.username}! 🔮`);
      try {
        await friendsApi.sendRequest(item.id);
      } catch (err) {
        console.warn('Error sending friendship request from BioMatch:', err);
      }
    } else if (direction === 'left') {
      showToast('Descartado ❌');
    }
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Estilos interpolados para la rotación y opacidad de los carteles
  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-30deg', '0deg', '30deg'],
    });

    return {
      transform: [
        ...position.getTranslateTransform(),
        { rotate }
      ],
    };
  };

  // Opacidad de los tags overlay de "CONECTAR" / "PASAR"
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const dislikeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Renderizar cada carta
  const renderCards = () => {
    if (currentIndex >= recommendations.length) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.magicIconContainer}>
            <Text style={{ fontSize: 50 }}>🔮</Text>
          </View>
          <Text style={styles.emptyTitle}>¡Eso es todo por ahora!</Text>
          <Text style={styles.emptySubtitle}>
            Hemos analizado todas las biografías de la facultad. Vuelve más tarde para descubrir nuevas mentes brillantes afines a ti.
          </Text>
          <TouchableOpacity 
            style={styles.refreshBtn}
            onPress={fetchRecommendations}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={styles.refreshBtnText}>Actualizar Feed</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return recommendations
      .map((item, index) => {
        if (index < currentIndex) {
          return null;
        }

        const isTopCard = index === currentIndex;

        if (isTopCard) {
          return (
            <Animated.View
              key={item.id}
              testID="recommendation-card"
              style={[getCardStyle(), styles.cardStyle, { zIndex: 99 }]}
              {...panResponder.panHandlers}
            >
              {/* Overlays decorativos de feedback de arrastre */}
              <Animated.View style={[styles.overlayTag, styles.likeTag, { opacity: likeOpacity }]}>
                <Text style={styles.likeTagText}>CONECTAR</Text>
              </Animated.View>
              <Animated.View style={[styles.overlayTag, styles.dislikeTag, { opacity: dislikeOpacity }]}>
                <Text style={styles.dislikeTagText}>PASAR</Text>
              </Animated.View>

              {/* Contenido de la Carta */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {item.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.titleInfo}>
                  <Text style={styles.username}>@{item.username}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.biographyLabel}>Biografía analizada por IA:</Text>
                <Text style={styles.biographyText}>"{item.biography}"</Text>
              </View>

              <View style={styles.gestureIndicatorContainer}>
                <Ionicons name="arrow-back-outline" size={16} color={colors.textMuted} />
                <Text style={styles.gestureIndicatorText}>Swipe para Pasar o Conectar</Text>
                <Ionicons name="arrow-forward-outline" size={16} color={colors.textMuted} />
              </View>
            </Animated.View>
          );
        }

        // Cartas apiladas por debajo (solo decorativas)
        // Solo renderizamos la carta que le sigue inmediatamente para evitar sobrecarga del árbol de vistas
        if (index === currentIndex + 1) {
          return (
            <View
              key={item.id}
              style={[styles.cardStyle, styles.stackedCard, { zIndex: 1 }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {item.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.titleInfo}>
                  <Text style={styles.username}>@{item.username}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.biographyLabel}>Biografía analizada por IA:</Text>
                <Text style={styles.biographyText}>"{item.biography}"</Text>
              </View>
            </View>
          );
        }

        return null;
      })
      .reverse(); // el rev para que el elemento actual quede al frente
  };

  // Pantalla cuando el usuario no tiene biografía registrada
  if (hasNoBio) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>BioMatch IA 🔮</Text>
        </View>

        <View style={styles.noBioContainer}>
          <View style={styles.warningGlow}>
            <Ionicons name="sparkles" size={54} color={colors.primary} />
          </View>
          <Text style={styles.noBioTitle}>¡Completa tu biografía!</Text>
          <Text style={styles.noBioSubtitle}>
            BioMatch IA analiza semánticamente tu biografía para recomendarte amigos con alta compatibilidad y afinidad de intereses.
          </Text>
          <Text style={styles.noBioNotice}>
            Para comenzar a descubrir personas inteligentes afines, escribe algo descriptivo sobre ti en tu perfil.
          </Text>

          <TouchableOpacity
            style={styles.goToProfileBtn}
            onPress={() => navigation.navigate('Perfil')}
            activeOpacity={0.8}
          >
            <Text style={styles.goToProfileBtnText}>Ir a Mi Perfil 👤</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BioMatch IA 🔮</Text>
        <Text style={styles.headerDescription}>Conexiones inteligentes por afinidad de biografía</Text>
      </View>

      {/* Baraja de cartas */}
      <View style={styles.deckContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Buscando mentes afines...</Text>
          </View>
        ) : (
          renderCards()
        )}
      </View>

      {/* Floating Toast Notification */}
      {toastMessage !== '' && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerDescription: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  deckContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    position: 'relative',
  },
  cardStyle: {
    position: 'absolute',
    width: SCREEN_WIDTH - spacing.md * 2,
    height: SCREEN_HEIGHT * 0.65,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  stackedCard: {
    transform: [{ scale: 0.95 }, { translateY: 15 }],
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: 'bold',
  },
  titleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: 'bold',
  },
  cardBody: {
    flex: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  biographyLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  biographyText: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  gestureIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  gestureIndicatorText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  magicIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(108, 99, 255, 0.2)',
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  refreshBtnText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  noBioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  warningGlow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.25)',
  },
  noBioTitle: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  noBioSubtitle: {
    fontSize: fontSizes.md,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  noBioNotice: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  goToProfileBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    alignItems: 'center',
  },
  goToProfileBtnText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  overlayTag: {
    position: 'absolute',
    top: spacing.xl,
    borderWidth: 3,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    zIndex: 100,
    transform: [{ rotate: '-15deg' }],
  },
  likeTag: {
    left: spacing.xl,
    borderColor: colors.success,
  },
  likeTagText: {
    fontSize: fontSizes.xl,
    color: colors.success,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dislikeTag: {
    right: spacing.xl,
    borderColor: colors.error,
    transform: [{ rotate: '15deg' }],
  },
  dislikeTagText: {
    fontSize: fontSizes.xl,
    color: colors.error,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: spacing.xxl * 2,
    backgroundColor: 'rgba(15, 14, 23, 0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  toastText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
