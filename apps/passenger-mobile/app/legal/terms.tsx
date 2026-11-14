import React from 'react';
import { useRouter } from 'expo-router';
import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { TERMS_OF_SERVICE } from '../../src/content/termsOfService';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <LegalDocumentView
      document={TERMS_OF_SERVICE}
      onBack={() => router.back()}
    />
  );
}

