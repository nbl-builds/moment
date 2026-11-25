import { colors } from '@moment/shared';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** A recorded voice note, played from the device (uploading is mocked). */
export function VoiceNote({ uri, durationMs, mine }: { uri: string; durationMs: number; mine: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  const toggle = () => {
    if (playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration - 0.05) void player.seekTo(0);
    player.play();
  };

  return (
    <View style={[styles.note, mine ? styles.mine : styles.theirs]}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        style={[styles.play, mine ? styles.playMine : styles.playTheirs]}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice note' : `Play voice note, ${fmt(durationMs)}`}
      >
        {playing ? (
          <View style={styles.pause}>
            <View style={[styles.pauseBar, mine && styles.barMine]} />
            <View style={[styles.pauseBar, mine && styles.barMine]} />
          </View>
        ) : (
          <View style={[styles.triangle, mine && styles.triangleMine]} />
        )}
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.fill, mine && styles.fillMine, { width: `${Math.min(100, progress * 100)}%` }]} />
      </View>
      <Text variant="body12" weight="medium" color={mine ? 'white' : 'secondaryTint2'}>
        {fmt(playing || status.currentTime > 0 ? status.currentTime * 1000 : durationMs)}
      </Text>
      <Icon name="mic" size={16} color={mine ? 'white' : 'secondaryTint2'} />
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    width: 220,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  mine: {
    backgroundColor: colors.secondary,
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 5,
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMine: {
    backgroundColor: colors.primary,
  },
  playTheirs: {
    backgroundColor: colors.secondary,
  },
  triangle: {
    marginLeft: 3,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.white,
  },
  triangleMine: {
    borderLeftColor: colors.secondary,
  },
  pause: {
    flexDirection: 'row',
    gap: 4,
  },
  pauseBar: {
    width: 4,
    height: 13,
    borderRadius: 1,
    backgroundColor: colors.white,
  },
  barMine: {
    backgroundColor: colors.secondary,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondaryTint3,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: colors.secondary,
  },
  fillMine: {
    backgroundColor: colors.primary,
  },
});
