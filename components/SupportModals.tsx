import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BRAND } from '../lib/brand';
import { Colors } from '../lib/theme';
import { t } from '../lib/i18n';

interface RequestResortModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RequestResortModal({ visible, onClose }: RequestResortModalProps) {
  const [resortName, setResortName] = useState('');
  const [destination, setDestination] = useState('');
  const [compareNote, setCompareNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const resetAndClose = () => {
    setError('');
    setDone(false);
    setResortName('');
    setDestination('');
    setCompareNote('');
    onClose();
  };

  const handleSubmit = async () => {
    const name = resortName.trim();
    const dest = destination.trim();
    if (!name || !dest) {
      setError('Please enter both the resort name and country/destination.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: BRAND.web3FormsKey,
          subject: 'StayOdds App - Resort Request',
          botcheck: false,
          resort_name: name,
          destination: dest,
          comparing_against: compareNote.trim() || '(none)',
          platform: Platform.OS,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not submit right now.');
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Request a Resort</Text>
              <Text style={styles.sub}>Missing a property? Add it to our StayOdds research queue.</Text>
            </View>
            <Pressable onPress={resetAndClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {done ? (
            <View style={styles.successWrap}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={26} color="#0F766E" />
              </View>
              <Text style={styles.successTitle}>Request received!</Text>
              <Text style={styles.successSub}>
                Thanks — we&rsquo;ve added your resort to the StayOdds queue.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={resetAndClose}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.label}>Resort Name *</Text>
              <TextInput
                style={styles.input}
                value={resortName}
                onChangeText={setResortName}
                placeholder="e.g. Amanpulo, Soneva Secret..."
                placeholderTextColor={Colors.inkMuted}
              />

              <Text style={styles.label}>Country / Destination *</Text>
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Philippines, Maldives, Amalfi Coast..."
                placeholderTextColor={Colors.inkMuted}
              />

              <Text style={styles.label}>Comparing it against another hotel? (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={compareNote}
                onChangeText={setCompareNote}
                placeholder="Optional note..."
                placeholderTextColor={Colors.inkMuted}
                multiline
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={[styles.primaryBtn, submitting && { opacity: 0.65 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Request</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface QuickFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickFeedbackModal({ visible, onClose }: QuickFeedbackModalProps) {
  const [useful, setUseful] = useState<'Yes' | 'Not yet' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const resetAndClose = () => {
    setUseful(null);
    setComment('');
    setError('');
    setDone(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!useful) {
      setError('Please tap Yes or Not yet first.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: BRAND.web3FormsKey,
          subject: 'StayOdds App Feedback',
          botcheck: false,
          useful,
          comment: comment.trim() || '(no comment)',
          platform: Platform.OS,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not send feedback right now.');
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Quick App Feedback</Text>
              <Text style={styles.sub}>Help us make StayOdds even more useful.</Text>
            </View>
            <Pressable onPress={resetAndClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {done ? (
            <View style={styles.successWrap}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={26} color="#0F766E" />
              </View>
              <Text style={styles.successTitle}>Thanks for helping improve StayOdds!</Text>
              <Pressable style={styles.primaryBtn} onPress={resetAndClose}>
                <Text style={styles.primaryBtnText}>{t("Close")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.label}>Is StayOdds useful?</Text>
              <View style={styles.choiceRow}>
                {(['Yes', 'Not yet'] as const).map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setUseful(opt)}
                    style={[styles.choiceBtn, useful === opt && styles.choiceBtnActive]}
                  >
                    <Ionicons
                      name={opt === 'Yes' ? 'thumbs-up-outline' : 'thumbs-down-outline'}
                      size={16}
                      color={useful === opt ? '#FFFFFF' : Colors.inkPrimary}
                    />
                    <Text style={[styles.choiceText, useful === opt && styles.choiceTextActive]}>
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>What is missing, confusing, or could be better? (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={comment}
                onChangeText={setComment}
                placeholder="Share a quick thought..."
                placeholderTextColor={Colors.inkMuted}
                multiline
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={[styles.primaryBtn, submitting && { opacity: 0.65 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("Send Feedback")}</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 19, 35, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  head: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  body: { padding: 18, gap: 10 },
  label: { fontSize: 12.5, fontWeight: '700', color: Colors.inkPrimary, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.inkPrimary,
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 74, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
  },
  choiceBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  choiceText: { fontSize: 13.5, fontWeight: '700', color: Colors.inkPrimary },
  choiceTextActive: { color: '#FFFFFF' },
  errorText: { fontSize: 12.5, color: '#B91C1C', fontWeight: '600' },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: Colors.accent,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  successWrap: { padding: 24, alignItems: 'center', gap: 10 },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 118, 110, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 16, fontWeight: '800', color: Colors.inkPrimary, textAlign: 'center' },
  successSub: { fontSize: 13, color: Colors.inkSecondary, textAlign: 'center' },
});
