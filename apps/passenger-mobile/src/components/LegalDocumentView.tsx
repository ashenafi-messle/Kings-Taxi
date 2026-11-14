import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ShieldCheck, Info, ChevronRight, FileText } from 'lucide-react-native';
import { theme } from '../theme';
import { AppHeader } from './AppHeader';
import { LegalDocument } from '../content/termsOfService';

interface LegalDocumentViewProps {
  document: LegalDocument;
  onBack?: () => void;
}

export function LegalDocumentView({ document, onBack }: LegalDocumentViewProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={document.title} showBack onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconCircle}>
            <FileText size={24} color="#502D0A" />
          </View>
          <Text style={styles.docTitle}>{document.title}</Text>
          <Text style={styles.docSubtitle}>{document.subtitle}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaBadge}>v{document.version}</Text>
            <Text style={styles.metaText}>Updated: {document.lastUpdated}</Text>
          </View>
        </View>

        {/* Legal Disclaimer / Review Tag Banner */}
        <View style={styles.disclaimerBox}>
          <View style={styles.disclaimerHeader}>
            <Info size={18} color="#B45309" />
            <Text style={styles.disclaimerTitle}>Enterprise Legal & Regulatory Notice</Text>
          </View>
          <Text style={styles.disclaimerText}>
            This document governs passenger services in Gondar City and throughout Ethiopia.
            Specific enterprise registration codes and regional court designations marked with{' '}
            <Text style={styles.tagHighlight}>[LEGAL_PLACEHOLDER]</Text> are designated for formal corporate legal review.
          </Text>
        </View>

        {/* Quick Jump / Table of Contents */}
        <View style={styles.tocCard}>
          <Text style={styles.tocTitle}>Table of Contents</Text>
          {document.sections.map((sec, idx) => {
            const isSelected = selectedSection === sec.id;
            return (
              <TouchableOpacity
                key={sec.id}
                style={[styles.tocRow, isSelected && styles.tocRowSelected]}
                onPress={() => setSelectedSection(isSelected ? null : sec.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tocIndex, isSelected && styles.tocIndexSelected]}>
                  {idx + 1}
                </Text>
                <Text
                  style={[styles.tocText, isSelected && styles.tocTextSelected]}
                  numberOfLines={1}
                >
                  {sec.title.replace(/^\d+\.\s*/, '')}
                </Text>
                <ChevronRight
                  size={16}
                  color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Document Sections */}
        {document.sections.map((sec) => (
          <View key={sec.id} style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>{sec.title}</Text>
            {sec.paragraphs.map((para, pIdx) => (
              <Text key={pIdx} style={styles.paragraph}>
                {para}
              </Text>
            ))}

            {sec.subsections?.map((sub, sIdx) => (
              <View key={sIdx} style={styles.subsectionWrap}>
                <Text style={styles.subsectionTitle}>{sub.title}</Text>
                {sub.items.map((item, iIdx) => (
                  <View key={iIdx} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        {/* Operational Certification Footer */}
        <View style={styles.footerCard}>
          <ShieldCheck size={28} color="#15803D" />
          <Text style={styles.footerTitle}>Kings Taxi Verified Mobility Platform</Text>
          <Text style={styles.footerDesc}>
            Certified dispatch operations under Ministry of Transport & Logistics and Amhara Regional Transport Bureau standards.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  headerCard: {
    backgroundColor: '#FAF4DC',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#EDD987',
    ...theme.shadows.cardGold,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF2D3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDD987',
    marginBottom: theme.spacing.sm,
  },
  docTitle: {
    ...theme.typography.h2,
    color: '#502D0A',
    textAlign: 'center',
  },
  docSubtitle: {
    ...theme.typography.caption,
    color: '#7B5836',
    textAlign: 'center',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  metaBadge: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#FAF4E5',
    color: '#A36B31',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E6D3A3',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  disclaimerBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  tagHighlight: {
    fontWeight: '800',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
  },
  tocCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#EDD987',
  },
  tocTitle: {
    ...theme.typography.h4,
    color: '#502D0A',
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EAD3',
  },
  tocRowSelected: {
    backgroundColor: '#FAF4DC',
  },
  tocIndex: {
    width: 24,
    fontSize: 12,
    fontWeight: '700',
    color: '#A36B31',
  },
  tocIndexSelected: {
    color: '#502D0A',
  },
  tocText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  tocTextSelected: {
    fontWeight: '700',
    color: '#502D0A',
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#EDD987',
    ...theme.shadows.cardGold,
  },
  sectionHeading: {
    ...theme.typography.h3,
    color: '#502D0A',
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  paragraph: {
    ...theme.typography.body,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 10,
  },
  subsectionWrap: {
    marginTop: 8,
    backgroundColor: '#FAF6ED',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#EDD987',
  },
  subsectionTitle: {
    ...theme.typography.h4,
    color: '#502D0A',
    fontWeight: '700',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A36B31',
    marginTop: 8,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  footerCard: {
    backgroundColor: '#FAF4DC',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EDD987',
    marginTop: theme.spacing.sm,
  },
  footerTitle: {
    ...theme.typography.h4,
    color: '#502D0A',
    marginTop: 8,
  },
  footerDesc: {
    ...theme.typography.caption,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
