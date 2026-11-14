import React from 'react';
import { useRouter } from 'expo-router';
import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { PRIVACY_POLICY } from '../../src/content/privacyPolicy';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <LegalDocumentView
      document={PRIVACY_POLICY}
      onBack={() => router.back()}
    />
  );
}

