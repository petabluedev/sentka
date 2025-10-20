import './styles.css';
export const metadata = { title: 'Sentka' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
