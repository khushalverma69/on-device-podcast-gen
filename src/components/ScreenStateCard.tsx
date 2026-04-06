import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';
import { uiSpacing, uiType } from '../constants/ui';

export function ScreenStateCard(props: {
  icon: string;
  title: string;
  body: string;
  actionLabel?: string;
  onPressAction?: () => void;
}) {
  return (
    <View style={s.wrap}>
      <View style={s.iconWrap}>
        <Text style={s.icon}>{props.icon}</Text>
      </View>
      <Text style={s.title}>{props.title}</Text>
      <Text style={s.body}>{props.body}</Text>
      {props.actionLabel && props.onPressAction ? (
        <Pressable style={s.actionBtn} onPress={props.onPressAction}>
          <Text style={s.actionTxt}>{props.actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: uiSpacing.xl,
    paddingHorizontal: uiSpacing.lg,
  },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.primary + '55',
    marginBottom: uiSpacing.lg,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    color: theme.textPrimary,
    fontSize: uiType.title,
    fontWeight: '800',
    marginBottom: uiSpacing.xs,
    textAlign: 'center',
  },
  body: {
    color: theme.textSecondary,
    fontSize: uiType.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: uiSpacing.lg,
  },
  actionBtn: {
    borderRadius: 14,
    backgroundColor: theme.primary,
    paddingHorizontal: uiSpacing.lg,
    paddingVertical: uiSpacing.sm,
  },
  actionTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
