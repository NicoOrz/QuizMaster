import type { Metadata } from 'next';
// Remove Geist font imports as the package is not installed
// import { GeistSans } from 'geist/font/sans';
// import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { QuizProvider } from '@/context/QuizContext';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

export const metadata: Metadata = {
  title: 'QuizMaster',
  description: 'An interactive quiz application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Remove Geist font variables from className */}
      <body className={`antialiased`}>
        <QuizProvider>
          {children}
          <Toaster /> {/* Add Toaster here */}
        </QuizProvider>
      </body>
    </html>
  );
}
