import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PosModule } from './components/pos/PosModule';
import { CatalogModule } from './components/catalog/CatalogModule';
import { LocationsModule } from './components/inventory/LocationsModule';
import { PurchasingModule } from './components/purchasing/PurchasingModule';
import { TransfersModule } from './components/transfers/TransfersModule';
import { StocktakeModule } from './components/stocktake/StocktakeModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { AcceptanceTestsModule } from './components/tests/AcceptanceTestsModule';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { triggerBarcodeScan } = useStore();

  const handleGlobalBarcodeScan = (barcode: string) => {
    triggerBarcodeScan(barcode);
    setActiveTab('pos');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900" dir="rtl">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 pb-12">
          {activeTab === 'pos' && <PosModule />}
          {activeTab === 'catalog' && <CatalogModule />}
          {activeTab === 'locations' && <LocationsModule />}
          {activeTab === 'purchases' && <PurchasingModule />}
          {activeTab === 'transfers' && <TransfersModule />}
          {activeTab === 'stocktake' && <StocktakeModule />}
          {activeTab === 'reports' && <ReportsModule />}
          {activeTab === 'tests' && <AcceptanceTestsModule />}
        </main>
      </div>

      {/* Laser Barcode Scanner Simulator Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleGlobalBarcodeScan}
      />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}
