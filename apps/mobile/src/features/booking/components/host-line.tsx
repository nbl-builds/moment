import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { hourRange } from '../format';
import { BOOK } from '../layout';

const AVATAR = BOOK.slot.avatar;

/**
 * Host row on slot and time cards (47:4198, 47:3864): 40pt avatar,
 * "With <host>" (host in orange), clock and time, price on the right.
 */
export function HostLine({
  name,
  avatarUrl,
  startsAt,
  endsAt,
  price,
  priceNote,
}: {
  name: string;
  avatarUrl: string | null;
  startsAt: string;
  endsAt: string;
  price: string;
  priceNote: string;
}) {
  const photo = api.media.url(avatarUrl);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {photo ? (
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        ) : (
          <Text variant="body16" weight="bold" color="secondary">
            {name.charAt(0)}
          </Text>
        )}
      </View>
      <View style={styles.text}>
        <Text variant="body15" weight="bold" color="secondary" numberOfLines={1}>
          With{' '}
          <Text variant="body15" weight="bold" color="host">
            {name}
          </Text>
        </Text>
        <View style={styles.time}>
          <Icon name="clock" size={14} color="secondary" />
          <Text variant="body12" weight="medium" color="secondaryTint2">
            {hourRange(startsAt, endsAt)}
          </Text>
        </View>
      </View>
      <View style={styles.price}>
        <Text variant="subText14" weight="extrabold" color="price">
          {price}
        </Text>
        <Text variant="body12" color="blackTint2">
          {priceNote}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: colors.bubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  time: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
