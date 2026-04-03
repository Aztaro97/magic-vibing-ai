import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

interface HoverToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

export function HoverToggle({ enabled, onToggle }: HoverToggleProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.label, { color: textColor }]}>
        Hover Inspector
      </Text>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: '#767577', true: '#ff6b6b' }}
        thumbColor={enabled ? '#ff0000' : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  label: {
    marginRight: 10,
    fontSize: 14,
    fontWeight: '600',
  },
});