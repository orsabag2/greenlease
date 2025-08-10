import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import React from 'react';

// Register the Noto Sans Hebrew font
Font.register({
  family: 'Noto Sans Hebrew',
  src: '/fonts/NotoSansHebrew-Regular.ttf',
  fontStyle: 'normal',
  fontWeight: 'normal',
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans Hebrew',
    fontSize: 12,
    padding: 40,
    direction: 'rtl',
    textAlign: 'right',
    lineHeight: 1.7,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateRow: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  contractText: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'right',
    direction: 'rtl',
    lineHeight: 1.7,
    wordBreak: 'break-word',
  },
});

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '_______';
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '_______';
  }
}

export default function ContractPdfDocument({ contract, meta }: { contract: string, meta: any }) {
  // Split contract into lines for rendering
  const lines = contract.split('\n').filter(line => line.trim() && line.trim() !== '⸻');
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>הסכם שכירות למגורים</Text>
        <Text style={styles.subtitle}>(שכירות בלתי מוגנת)</Text>
        <Text style={styles.dateRow}>
          חוזה זה נחתם באמצעים דיגיטליים בהתאם לחוק חתימה אלקטרונית, התשס"א–2001.
        </Text>
        <View>
          {lines.map((line, idx) => (
            <Text key={idx} style={styles.contractText}>{line.replace(/<[^>]+>/g, '')}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
} 