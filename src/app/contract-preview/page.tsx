import { Metadata } from 'next';
import ContractPreviewPage from './ContractPreviewPage';

export async function generateMetadata(): Promise<Metadata> {
  // Note: We can't access localStorage here since this runs on server
  return {
    title: 'הסכם שכירות למגורים',
    description: 'תצוגה מקדימה של הסכם שכירות',
  };
}

export default function Page() {
  return <ContractPreviewPage />;
} 