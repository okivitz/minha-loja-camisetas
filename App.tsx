
import React, { useState, useEffect, useCallback } from 'react';
import { PlainTShirt, Print, FinishedTShirt, Sale, ModalType, PlainTShirtColor, Gender, TShirtSize } from './types';
import { PLAIN_T_SHIRT_COLORS, GENDERS, T_SHIRT_SIZES, APP_TITLE, TAB_OPTIONS } from './constants';
import Modal from './components/Modal';
import DashboardCard from './components/DashboardCard';
import { ShirtIcon, TagIcon, CogIcon, ShoppingCartIcon, CurrencyDollarIcon, PlusCircleIcon, EyeIcon, XCircleIcon, TrashIcon, DocumentTextIcon, ChartBarIcon, MinusCircleIcon } from './components/icons';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(TAB_OPTIONS[0]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [plainTShirts, setPlainTShirts] = useState<PlainTShirt[]>([]);
  const [prints, setPrints] = useState<Print[]>([]);
  const [finishedTShirts, setFinishedTShirts] = useState<FinishedTShirt[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Global search term, potentially to be deprecated if each list handles its own
  // For now, renderListItems uses its own internal searchTerm state.
  // const [searchTerm, setSearchTerm] = useState(''); 

  // Form states
  const [plainTShirtForm, setPlainTShirtForm] = useState({ sku: '', color: PLAIN_T_SHIRT_COLORS[0], gender: GENDERS[0], size: T_SHIRT_SIZES[0], quantity: 10, supplier: '', cost: 0 });
  const [printForm, setPrintForm] = useState({ sku: '', name: '', imageUrl: 'https://picsum.photos/seed/'+ Date.now() +'/100/100', quantity: 10, localFile: null as File | null });
  const [productionForm, setProductionForm] = useState({ plainTShirtId: '', printId: '', quantity: 1, price: 29.90 });
  const [saleForm, setSaleForm] = useState({ finishedTShirtId: '', quantity: 1, clientName: '' });
  
  const [selectedFinishedTShirtForSale, setSelectedFinishedTShirtForSale] = useState<FinishedTShirt | null>(null);
  const [showSalesReport, setShowSalesReport] = useState<boolean>(false);

  const [itemToAdjustStock, setItemToAdjustStock] = useState<PlainTShirt | Print | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(1);

  // --- Filter States ---
  const [plainTShirtFilters, setPlainTShirtFilters] = useState<{color: PlainTShirtColor | '', gender: Gender | '', size: TShirtSize | ''}>({ color: '', gender: '', size: '' });
  const [salesFilters, setSalesFilters] = useState<{startDate: string, endDate: string, productId: string, clientName: string}>({ startDate: '', endDate: '', productId: '', clientName: '' });


  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured. Using localStorage if available, otherwise starting empty.");
      setPlainTShirts(JSON.parse(localStorage.getItem('plainTShirts_fallback') || '[]'));
      setPrints(JSON.parse(localStorage.getItem('prints_fallback') || '[]'));
      setFinishedTShirts(JSON.parse(localStorage.getItem('finishedTShirts_fallback') || '[]'));
      setSales(JSON.parse(localStorage.getItem('sales_fallback') || '[]'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const [plainTShirtsData, printsData, finishedTShirtsData, salesData] = await Promise.all([
        supabase.from('plain_tshirts').select('*').order('created_at', { ascending: false }),
        supabase.from('prints').select('*').order('created_at', { ascending: false }),
        supabase.from('finished_tshirts').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').order('saleDate', { ascending: false })
      ]);

      if (plainTShirtsData.error) throw plainTShirtsData.error;
      setPlainTShirts(plainTShirtsData.data || []);
      
      if (printsData.error) throw printsData.error;
      setPrints(printsData.data || []);

      if (finishedTShirtsData.error) throw finishedTShirtsData.error;
      setFinishedTShirts(finishedTShirtsData.data || []);

      if (salesData.error) throw salesData.error;
      setSales(salesData.data || []);

    } catch (e: any) {
      console.error("Error loading data from Supabase:", e);
      setError(`Falha ao carregar dados: ${e.message}. Verifique a configuração do Supabase e a existência das tabelas (incluindo colunas 'sku' se adicionadas). Iniciando com dados vazios.`);
      setPlainTShirts([]); setPrints([]); setFinishedTShirts([]); setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    loadData();
  }, [loadData]);


  const openModal = (type: ModalType, itemToAdjust?: PlainTShirt | Print) => {
    setModalType(type);
    setError(null); 
    setSuccessMessage(null);
    if (type === 'produceTShirt') {
        setProductionForm(prev => ({ ...prev, plainTShirtId: plainTShirts.find(pt => pt.quantity > 0)?.id || '', printId: prints.find(p => p.quantity > 0)?.id || ''}));
    }
    if (type === 'recordSale') {
        const firstAvailableShirt = finishedTShirts.find(ft => ft.quantityInStock > 0);
        if (firstAvailableShirt) {
            setSaleForm(prev => ({ ...prev, finishedTShirtId: firstAvailableShirt.id, quantity: 1, clientName: '' }));
            setSelectedFinishedTShirtForSale(firstAvailableShirt);
        } else {
            setSaleForm(prev => ({...prev, finishedTShirtId: '', quantity: 1, clientName: ''}));
            setSelectedFinishedTShirtForSale(null);
        }
    }
    if (type === 'adjustStock' && itemToAdjust) {
        setItemToAdjustStock(itemToAdjust);
        setAdjustmentQuantity(1); 
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setPlainTShirtForm({ sku: '', color: PLAIN_T_SHIRT_COLORS[0], gender: GENDERS[0], size: T_SHIRT_SIZES[0], quantity: 10, supplier: '', cost: 0 });
    setPrintForm({ sku: '', name: '', imageUrl: 'https://picsum.photos/seed/'+ Date.now() +'/100/100', quantity: 10, localFile: null });
    setProductionForm({ plainTShirtId: plainTShirts.find(pt => pt.quantity > 0)?.id || '', printId: prints.find(p => p.quantity > 0)?.id || '', quantity: 1, price: 29.90 });
    const firstAvailableShirt = finishedTShirts.find(ft => ft.quantityInStock > 0);
    setSaleForm({ finishedTShirtId: firstAvailableShirt ? firstAvailableShirt.id : '', quantity: 1, clientName: '' });
    setSelectedFinishedTShirtForSale(firstAvailableShirt || null);
    setItemToAdjustStock(null);
    setAdjustmentQuantity(1);
    setError(null);
    setSuccessMessage(null);
  };

  // --- CRUD and Business Logic Functions (handleAddPlainTShirt, handleDeletePrint, etc.) ---
  // These functions remain largely the same as before, so they are omitted for brevity here,
  // but they are part of the full App.tsx file.
  // Assume all previous CRUD functions (handleAddPlainTShirt, handleDeletePlainTShirt, 
  // handleAddPrint, handleDeletePrint, handleProduceTShirt, handleRecordSale, handleDeleteSale, 
  // handleAdjustStockQuantity) are present here.

  const handleAddPlainTShirt = async () => {
    const { sku, color, gender, size, quantity, supplier, cost } = plainTShirtForm;
    if (quantity <= 0) { setError("Quantidade deve ser maior que zero."); return; }
    if (cost < 0) { setError("Custo não pode ser negativo."); return; }
    setError(null);
    const id = `${color}-${gender}-${size}`; 
    
    const originalPlainTShirts = [...plainTShirts]; 
    const existingIndex = originalPlainTShirts.findIndex(pt => pt.id === id);
    let newShirtData: PlainTShirt;

    if (existingIndex > -1) {
      const existingShirt = originalPlainTShirts[existingIndex];
      newShirtData = { ...existingShirt, sku: sku?.trim() || undefined, quantity: existingShirt.quantity + quantity, supplier: supplier?.trim() || undefined, cost };
      setPlainTShirts(prev => prev.map((pt, index) => index === existingIndex ? newShirtData : pt));
    } else {
      newShirtData = { id, sku: sku?.trim() || undefined, color, gender, size, quantity, supplier: supplier?.trim() || undefined, cost, created_at: new Date().toISOString() };
      setPlainTShirts(prev => [...prev, newShirtData]);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error: upsertError } = await supabase.from('plain_tshirts').upsert(newShirtData, { onConflict: 'id' }).select();
        if (upsertError) throw upsertError;
        if (data && data.length > 0) {
             setPlainTShirts(prev => prev.map(pt => pt.id === data[0].id ? data[0] as PlainTShirt : pt));
             setSuccessMessage("Camiseta lisa adicionada/atualizada com sucesso!");
        } else { await loadData(); }
      } catch (e: any) {
        setError(`Falha ao salvar camiseta lisa: ${e.message}. Verifique se o SKU já existe se houver uma restrição UNIQUE no banco.`); setPlainTShirts(originalPlainTShirts); 
      }
    } else {
        const updatedList = plainTShirts.map(pt => pt.id === id ? newShirtData : (pt.id === newShirtData.id && existingIndex === -1 ? newShirtData : pt));
        if(existingIndex === -1 && !updatedList.find(pt => pt.id === newShirtData.id)) updatedList.push(newShirtData);
        localStorage.setItem('plainTShirts_fallback', JSON.stringify(updatedList));
        setSuccessMessage("Camiseta lisa adicionada/atualizada (localmente).");
    }
    closeModal();
  };

  const handleDeletePlainTShirt = async (id: string) => {
    if (window.confirm(`Tem certeza que deseja apagar esta definição de camiseta lisa (${id})?\n\nATENÇÃO: Esta ação é irreversível e pode afetar camisetas prontas ou relatórios de vendas que dependam deste item. O estoque de camisetas prontas NÃO será ajustado.`)) {
        const originalPlainTShirts = [...plainTShirts];
        setPlainTShirts(prev => prev.filter(pt => pt.id !== id)); 
        setError(null); setSuccessMessage(null);

        if (isSupabaseConfigured()) {
            try {
                const { error: deleteError } = await supabase.from('plain_tshirts').delete().match({ id });
                if (deleteError) throw deleteError;
                setSuccessMessage("Camiseta lisa apagada com sucesso!");
            } catch (e: any) { 
                setError(`Falha ao apagar camiseta lisa: ${e.message}. Verifique se este item está sendo usado em outros registros se houver restrições de chave estrangeira no banco.`); setPlainTShirts(originalPlainTShirts); 
            }
        } else {
            localStorage.setItem('plainTShirts_fallback', JSON.stringify(plainTShirts.filter(pt => pt.id !== id)));
            setSuccessMessage("Camiseta lisa apagada (localmente).");
        }
    }
  };
  
  const handleAddPrint = async () => {
    const { sku, name, imageUrl, quantity } = printForm;
    if (!name.trim()) { setError("Nome da estampa é obrigatório."); return; }
    if (quantity <= 0) { setError("Quantidade deve ser maior que zero."); return; }
    setError(null);
    const id = name; 
    
    const originalPrints = [...prints]; 
    const existingIndex = originalPrints.findIndex(p => p.id === id);
    let newPrintData: Print = { id, sku: sku?.trim() || undefined, name, imageUrl, quantity, created_at: new Date().toISOString() };

    if (existingIndex > -1) {
        const existingPrint = originalPrints[existingIndex];
        newPrintData = { ...existingPrint, sku: sku?.trim() || undefined, quantity: existingPrint.quantity + quantity, imageUrl }; 
        setPrints(prev => prev.map((p, index) => index === existingIndex ? newPrintData : p));
    } else {
        setPrints(prev => [...prev, newPrintData]);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error: upsertError } = await supabase.from('prints').upsert(newPrintData, { onConflict: 'id' }).select();
        if (upsertError) throw upsertError;
        if (data && data.length > 0) {
             setPrints(prev => prev.map(p => p.id === data[0].id ? data[0] as Print : p));
             setSuccessMessage("Estampa adicionada/atualizada com sucesso!");
        }  else { await loadData(); }
      } catch (e: any) {
        setError(`Falha ao salvar estampa: ${e.message}. Verifique se o SKU já existe se houver uma restrição UNIQUE no banco.`); setPrints(originalPrints); 
      }
    } else {
        const updatedList = prints.map(p => p.id === id ? newPrintData : (p.id === newPrintData.id && existingIndex === -1 ? newPrintData : p));
        if(existingIndex === -1 && !updatedList.find(p => p.id === newPrintData.id)) updatedList.push(newPrintData);
        localStorage.setItem('prints_fallback', JSON.stringify(updatedList));
        setSuccessMessage("Estampa adicionada/atualizada (localmente).");
    }
    closeModal();
  };

  const handleDeletePrint = async (id: string) => {
    if (window.confirm(`Tem certeza que deseja apagar esta definição de estampa (${id})?\n\nATENÇÃO: Esta ação é irreversível e pode afetar camisetas prontas ou relatórios de vendas que dependam deste item. O estoque de camisetas prontas NÃO será ajustado.`)) {
        const originalPrints = [...prints];
        setPrints(prev => prev.filter(p => p.id !== id)); 
        setError(null); setSuccessMessage(null);

        if (isSupabaseConfigured()) {
            try {
                const { error: deleteError } = await supabase.from('prints').delete().match({ id });
                if (deleteError) throw deleteError;
                setSuccessMessage("Estampa apagada com sucesso!");
            } catch (e: any) {
                setError(`Falha ao apagar estampa: ${e.message}. Verifique se este item está sendo usado em outros registros se houver restrições de chave estrangeira no banco.`); setPrints(originalPrints); 
            }
        } else {
            localStorage.setItem('prints_fallback', JSON.stringify(prints.filter(p => p.id !== id)));
            setSuccessMessage("Estampa apagada (localmente).");
        }
    }
  };

  const handlePrintImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrintForm(prev => ({ ...prev, imageUrl: reader.result as string, localFile: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProduceTShirt = async () => {
    const { plainTShirtId, printId, quantity, price } = productionForm;
    if (!plainTShirtId || !printId) { setError("Selecione uma camiseta lisa e uma estampa."); return; }
    if (quantity <= 0 || price <= 0) { setError("Quantidade e Preço devem ser maiores que zero."); return; }
    setError(null);

    const plainShirtStock = plainTShirts.find(pt => pt.id === plainTShirtId);
    const printStock = prints.find(p => p.id === printId);

    if (!plainShirtStock || !printStock) { setError("Camiseta base ou estampa não encontrada."); return; }
    if (plainShirtStock.quantity < quantity) { setError(`Estoque insuficiente de camisetas ${plainShirtStock.color} ${plainShirtStock.gender} ${plainShirtStock.size}. Disponível: ${plainShirtStock.quantity}`); return; }
    if (printStock.quantity < quantity) { setError(`Estoque insuficiente da estampa ${printStock.name}. Disponível: ${printStock.quantity}`); return; }

    const originalPlainTShirts = [...plainTShirts];
    const originalPrints = [...prints];
    const originalFinishedTShirts = [...finishedTShirts];

    const updatedPlainShirtsState = plainTShirts.map(pt => pt.id === plainTShirtId ? { ...pt, quantity: pt.quantity - quantity } : pt);
    const updatedPrintsState = prints.map(p => p.id === printId ? { ...p, quantity: p.quantity - quantity } : p);
    
    const finishedTShirtId = `${plainTShirtId}_${printId}`; 
    const finishedSku = `${plainShirtStock.sku || plainShirtStock.id}-${printStock.sku || printStock.id}`;

    const existingFinishedShirtIndex = finishedTShirts.findIndex(ft => ft.id === finishedTShirtId);
    let newFinishedProductData: FinishedTShirt;

    if (existingFinishedShirtIndex > -1) {
        const existing = finishedTShirts[existingFinishedShirtIndex];
        newFinishedProductData = { ...existing, sku: existing.sku || finishedSku, quantityInStock: existing.quantityInStock + quantity, price }; 
        setFinishedTShirts(prev => prev.map((ft, i) => i === existingFinishedShirtIndex ? newFinishedProductData : ft));
    } else {
        newFinishedProductData = {
            id: finishedTShirtId, sku: finishedSku, plainTShirtId, printId,
            color: plainShirtStock.color, gender: plainShirtStock.gender, size: plainShirtStock.size,
            printName: printStock.name, printImageUrl: printStock.imageUrl,
            quantityInStock: quantity, price, created_at: new Date().toISOString()
        };
        setFinishedTShirts(prev => [...prev, newFinishedProductData]);
    }
    setPlainTShirts(updatedPlainShirtsState);
    setPrints(updatedPrintsState);

    if (isSupabaseConfigured()) {
        try {
            await supabase.from('plain_tshirts').update({ quantity: plainShirtStock.quantity - quantity }).match({ id: plainTShirtId }).throwOnError();
            await supabase.from('prints').update({ quantity: printStock.quantity - quantity }).match({ id: printId }).throwOnError();
            const { data: finishedData } = await supabase.from('finished_tshirts').upsert(newFinishedProductData, { onConflict: 'id' }).select().throwOnError();
            
            if (finishedData && finishedData.length > 0) {
                 setFinishedTShirts(prev => { 
                    const dataFinished = finishedData[0] as FinishedTShirt;
                    const idx = prev.findIndex(f => f.id === dataFinished.id);
                    if (idx > -1) return prev.map(f => f.id === dataFinished.id ? dataFinished : f);
                    return [...prev, dataFinished];
                 });
                 setSuccessMessage("Camiseta produzida com sucesso!");
            } else { await loadData(); }
        } catch (e: any) {
            setError(`Falha ao produzir camiseta: ${e.message}`);
            setPlainTShirts(originalPlainTShirts); setPrints(originalPrints); setFinishedTShirts(originalFinishedTShirts);
        }
    } else {
        localStorage.setItem('plainTShirts_fallback', JSON.stringify(updatedPlainShirtsState));
        localStorage.setItem('prints_fallback', JSON.stringify(updatedPrintsState));
        let updatedFinishedList = finishedTShirts.map(ft => ft.id === finishedTShirtId ? newFinishedProductData : ft);
        if (existingFinishedShirtIndex === -1 && !updatedFinishedList.find(ft => ft.id === newFinishedProductData.id)) {
            updatedFinishedList.push(newFinishedProductData);
        }
        localStorage.setItem('finishedTShirts_fallback', JSON.stringify(updatedFinishedList));
        setSuccessMessage("Camiseta produzida (localmente).");
    }
    closeModal();
  };
  
  const handleRecordSale = async () => {
    const { finishedTShirtId, quantity, clientName } = saleForm;
    if (!finishedTShirtId) { setError("Selecione uma camiseta para vender."); return; }
    if (quantity <= 0) { setError("Quantidade deve ser maior que zero."); return; }
     if (!selectedFinishedTShirtForSale) { setError("Produto selecionado inválido."); return; }
    if (selectedFinishedTShirtForSale.quantityInStock < quantity) {
        setError(`Estoque insuficiente de ${selectedFinishedTShirtForSale.printName}. Disponível: ${selectedFinishedTShirtForSale.quantityInStock}`);
        return;
    }
    setError(null);
    
    const finishedShirt = finishedTShirts.find(ft => ft.id === finishedTShirtId); 
    if (!finishedShirt) { setError("Camiseta pronta não encontrada."); return; }
    
    const originalFinishedTShirts = [...finishedTShirts];
    const originalSales = [...sales];

    const updatedFinishedShirtData = { ...finishedShirt, quantityInStock: finishedShirt.quantityInStock - quantity };
    setFinishedTShirts(prev => prev.map(ft => ft.id === finishedTShirtId ? updatedFinishedShirtData : ft));
    
    const newSale: Sale = {
      id: crypto.randomUUID(), 
      finishedTShirtId,
      finishedTShirtDetails: { 
        sku: finishedShirt.sku,
        color: finishedShirt.color, 
        gender: finishedShirt.gender, 
        size: finishedShirt.size, 
        printName: finishedShirt.printName 
      },
      clientName: clientName?.trim() || undefined,
      quantitySold: quantity, salePricePerUnit: finishedShirt.price, totalSaleAmount: finishedShirt.price * quantity,
      saleDate: new Date().toISOString(),
    };
    setSales(prev => [newSale, ...prev]); 

    if (isSupabaseConfigured()) {
        try {
            await supabase.from('finished_tshirts').update({ quantityInStock: updatedFinishedShirtData.quantityInStock }).match({ id: finishedTShirtId }).throwOnError();
            const { data: saleData } = await supabase.from('sales').insert([newSale]).select().throwOnError(); 

            if (saleData && saleData.length > 0) {
                const returnedSale = saleData[0] as Sale;
                setSales(prev => prev.map(s => s.id === newSale.id ? returnedSale : s)); 
                setSuccessMessage("Venda registrada com sucesso!");
            } else { await loadData(); }
        } catch (e: any) {
            setError(`Falha ao registrar venda: ${e.message}`);
            setFinishedTShirts(originalFinishedTShirts); setSales(originalSales); 
        }
    } else {
        localStorage.setItem('finishedTShirts_fallback', JSON.stringify(finishedTShirts.map(ft => ft.id === finishedTShirtId ? updatedFinishedShirtData : ft)));
        localStorage.setItem('sales_fallback', JSON.stringify([newSale, ...sales]));
        setSuccessMessage("Venda registrada (localmente).");
    }
    closeModal();
  };

  const handleDeleteSale = async (saleId: string) => {
    if (window.confirm("Tem certeza que deseja apagar esta venda? Esta ação não pode ser desfeita e NÃO ajustará o estoque do produto vendido.")) {
        const originalSales = [...sales];
        setSales(prev => prev.filter(s => s.id !== saleId));
        setError(null); setSuccessMessage(null);

        if (isSupabaseConfigured()) {
            try {
                const { error: deleteError } = await supabase.from('sales').delete().match({ id: saleId });
                if (deleteError) throw deleteError;
                setSuccessMessage("Venda apagada com sucesso!");
            } catch (e: any) {
                setError(`Falha ao apagar venda: ${e.message}`);
                setSales(originalSales); 
            }
        } else {
            localStorage.setItem('sales_fallback', JSON.stringify(sales.filter(s => s.id !== saleId)));
            setSuccessMessage("Venda apagada (localmente).");
        }
    }
  };

  const handleAdjustStockQuantity = async () => {
    if (!itemToAdjustStock) {
        setError("Nenhum item selecionado para ajuste.");
        return;
    }
    if (adjustmentQuantity <= 0) {
        setError("Quantidade a remover deve ser maior que zero.");
        return;
    }
    if (adjustmentQuantity > itemToAdjustStock.quantity) {
        setError(`Não é possível remover ${adjustmentQuantity} unidades. Apenas ${itemToAdjustStock.quantity} em estoque.`);
        return;
    }
    setError(null);

    const newQuantity = itemToAdjustStock.quantity - adjustmentQuantity;
    const itemType = 'color' in itemToAdjustStock ? 'plainTShirt' : 'print'; 

    let originalItems: Array<PlainTShirt | Print>;
    let updatedItemsState: Array<PlainTShirt | Print>;
    let tableName: string;

    if (itemType === 'plainTShirt') {
        originalItems = [...plainTShirts];
        updatedItemsState = plainTShirts.map(pt => 
            pt.id === itemToAdjustStock.id ? { ...pt, quantity: newQuantity } : pt
        );
        setPlainTShirts(updatedItemsState as PlainTShirt[]);
        tableName = 'plain_tshirts';
    } else { 
        originalItems = [...prints];
        updatedItemsState = prints.map(p => 
            p.id === itemToAdjustStock.id ? { ...p, quantity: newQuantity } : p
        );
        setPrints(updatedItemsState as Print[]);
        tableName = 'prints';
    }
    
    if (isSupabaseConfigured()) {
        try {
            const { error: updateError } = await supabase
                .from(tableName)
                .update({ quantity: newQuantity })
                .match({ id: itemToAdjustStock.id });

            if (updateError) throw updateError;
            setSuccessMessage("Estoque ajustado com sucesso!");
        } catch (e: any) {
            setError(`Falha ao ajustar estoque: ${e.message}`);
            if (itemType === 'plainTShirt') {
                setPlainTShirts(originalItems as PlainTShirt[]);
            } else {
                setPrints(originalItems as Print[]);
            }
        }
    } else {
        if (itemType === 'plainTShirt') {
            localStorage.setItem('plainTShirts_fallback', JSON.stringify(updatedItemsState));
        } else {
            localStorage.setItem('prints_fallback', JSON.stringify(updatedItemsState));
        }
        setSuccessMessage("Estoque ajustado (localmente).");
    }
    closeModal();
};

  // --- Report and Formatting Functions ---
  const calculateSalesReport = () => {
    let totalItemsSold = 0;
    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;
    
    const detailedSales = sales.map(sale => {
      const finishedShirt = finishedTShirts.find(ft => ft.id === sale.finishedTShirtId);
      const plainShirt = finishedShirt ? plainTShirts.find(pt => pt.id === finishedShirt.plainTShirtId) : undefined;
      const costPerUnit = plainShirt?.cost ?? 0; 
      
      const saleCost = costPerUnit * sale.quantitySold;
      const saleProfit = sale.totalSaleAmount - saleCost;
      
      totalItemsSold += sale.quantitySold;
      totalRevenue += sale.totalSaleAmount;
      totalCostOfGoodsSold += saleCost;
      
      return {
        ...sale,
        sku: finishedShirt?.sku, 
        costPerUnit,
        totalCostForSale: saleCost,
        profitPerUnit: sale.salePricePerUnit - costPerUnit,
        totalProfitForSale: saleProfit,
      };
    });
    const totalProfit = totalRevenue - totalCostOfGoodsSold;
    return {
      detailedSales,
      summary: { totalItemsSold, totalRevenue, totalCostOfGoodsSold, totalProfit }
    };
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  const formatDate = (isoDate: string | undefined) => {
    if(!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
  }

  // --- Filter UI Helper Components ---
  const FilterDropdown: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: Array<{value: string, label: string}>, allOptionLabel?: string}> = 
    ({label, value, onChange, options, allOptionLabel = "Todos"}) => (
    <div className="flex-1 min-w-[150px]">
      <label htmlFor={`filter-${label}`} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select 
        id={`filter-${label}`} 
        value={value} 
        onChange={onChange} 
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
      >
        <option value="">{allOptionLabel}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  const FilterDateInput: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = 
    ({label, value, onChange}) => (
    <div className="flex-1 min-w-[150px]">
      <label htmlFor={`filter-${label}`} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input 
        type="date" 
        id={`filter-${label}`} 
        value={value} 
        onChange={onChange} 
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
      />
    </div>
  );
  
  const FilterTextInput: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string}> = 
    ({label, value, onChange, placeholder}) => (
    <div className="flex-1 min-w-[150px]">
      <label htmlFor={`filter-${label}`} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input 
        type="text" 
        id={`filter-${label}`} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
      />
    </div>
  );

  // --- Filter Logic Functions ---
  const plainTShirtFilterFn = (item: PlainTShirt, filters: typeof plainTShirtFilters): boolean => {
    if (filters.color && item.color !== filters.color) return false;
    if (filters.gender && item.gender !== filters.gender) return false;
    if (filters.size && item.size !== filters.size) return false;
    return true;
  };

  const salesFilterFn = (item: Sale, filters: typeof salesFilters): boolean => {
    if (filters.startDate) {
        const saleDate = new Date(item.saleDate);
        const startDate = new Date(filters.startDate);
        startDate.setHours(0,0,0,0); // Compare date part only
        if (saleDate < startDate) return false;
    }
    if (filters.endDate) {
        const saleDate = new Date(item.saleDate);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23,59,59,999); // Compare date part only
        if (saleDate > endDate) return false;
    }
    if (filters.productId && item.finishedTShirtId !== filters.productId) return false;
    if (filters.clientName && !item.clientName?.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
    return true;
  };


  // --- Main Render Sections (Dashboard, Inventory, Production, Sales) ---
  const DashboardContent: React.FC = () => {
    const totalPlainStock = plainTShirts.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrintStock = prints.reduce((sum, item) => sum + item.quantity, 0);
    const totalFinishedStock = finishedTShirts.reduce((sum, item) => sum + item.quantityInStock, 0);
    const totalSoldCount = sales.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalRevenue = sales.reduce((sum, item) => sum + item.totalSaleAmount, 0);

    const navigateToTab = (tabName: string) => {
        setActiveTab(tabName); setError(null); setSuccessMessage(null); 
    };

    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <DashboardCard title="Camisetas Lisas" value={totalPlainStock} icon={<ShirtIcon className="w-7 h-7"/>} colorClass="bg-sky-500" onClick={() => navigateToTab(TAB_OPTIONS[1])} ariaLabel="Ver estoque de camisetas lisas"/>
          <DashboardCard title="Estampas" value={totalPrintStock} icon={<TagIcon className="w-7 h-7"/>} colorClass="bg-indigo-500" onClick={() => navigateToTab(TAB_OPTIONS[1])} ariaLabel="Ver estoque de estampas"/>
          <DashboardCard title="Camisetas Prontas" value={totalFinishedStock} icon={<CogIcon className="w-7 h-7"/>} colorClass="bg-emerald-500" onClick={() => navigateToTab(TAB_OPTIONS[2])} ariaLabel="Ver estoque de camisetas prontas"/>
          <DashboardCard title="Itens Vendidos" value={totalSoldCount} icon={<ShoppingCartIcon className="w-7 h-7"/>} colorClass="bg-amber-500" onClick={() => navigateToTab(TAB_OPTIONS[3])} ariaLabel="Ver registro de vendas"/>
          <DashboardCard title="Receita Total" value={formatCurrency(totalRevenue)} icon={<CurrencyDollarIcon className="w-7 h-7"/>} colorClass="bg-rose-500" onClick={() => navigateToTab(TAB_OPTIONS[3])} ariaLabel="Ver resumo de receita de vendas"/>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-2 text-blue-500" /> Visão Geral Rápida
            </h2>
            <div className="space-y-3">
                {plainTShirts.length > 0 ? (
                    <p className="text-gray-600">Você tem <span className="font-bold text-sky-600">{totalPlainStock}</span> camisetas lisas de <span className="font-bold text-sky-600">{new Set(plainTShirts.map(pt => `${pt.color}-${pt.gender}-${pt.size}`)).size}</span> tipos diferentes.</p>
                ) : <p className="text-gray-500">Nenhuma camiseta lisa em estoque.</p>}
                {prints.length > 0 ? (
                    <p className="text-gray-600">Você tem <span className="font-bold text-indigo-600">{totalPrintStock}</span> estampas de <span className="font-bold text-indigo-600">{prints.length}</span> designs diferentes.</p>
                ) : <p className="text-gray-500">Nenhuma estampa em estoque.</p>}
                {finishedTShirts.length > 0 ? (
                    <p className="text-gray-600">Você tem <span className="font-bold text-emerald-600">{totalFinishedStock}</span> camisetas prontas para venda, combinando <span className="font-bold text-emerald-600">{finishedTShirts.length}</span> variações de produto.</p>
                ) : <p className="text-gray-500">Nenhuma camiseta pronta para venda.</p>}
                 {sales.length > 0 ? (
                    <p className="text-gray-600">Foram registradas <span className="font-bold text-amber-600">{sales.length}</span> vendas, totalizando <span className="font-bold text-rose-600">{formatCurrency(totalRevenue)}</span> em receita.</p>
                ) : <p className="text-gray-500">Nenhuma venda registrada ainda.</p>}
            </div>
        </div>
      </div>
    );
  };
  
  // Updated renderListItems
  const renderListItems = <T extends { id: string }>(
    items: T[], // Full list for this section
    renderItemCard: (item: T) => React.ReactNode,
    title: string,
    options?: {
        addAction?: () => void;
        emptyMessage?: string;
        renderSummary?: (filteredItems: T[]) => React.ReactNode; // Summary of search results
        extraHeaderContent?: React.ReactNode;
        // New props for specific filters
        additionalFilterComponent?: React.ReactNode;
        specificFilterFn?: (item: T, activeFilters: any) => boolean;
        activeSpecificFilters?: any;
    }
  ) => {
    const { 
        addAction, 
        emptyMessage = "Nenhum item encontrado.", 
        renderSummary, 
        extraHeaderContent,
        additionalFilterComponent,
        specificFilterFn,
        activeSpecificFilters
    } = options || {};

    const [currentSearchTerm, setCurrentSearchTerm] = useState('');

    // Apply specific filters first, then text search
    const specificallyFilteredItems = specificFilterFn && activeSpecificFilters 
        ? items.filter(item => specificFilterFn(item, activeSpecificFilters)) 
        : items;

    const searchFilteredItems = specificallyFilteredItems.filter(item => {
        if (!currentSearchTerm) return true;
        return Object.values(item).some(value => {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) { 
                return Object.values(value).some(nestedValue => 
                    String(nestedValue).toLowerCase().includes(currentSearchTerm.toLowerCase())
                );
            }
            return String(value).toLowerCase().includes(currentSearchTerm.toLowerCase());
        });
    });
    
    const finalFilteredItems = searchFilteredItems;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-700">{title}</h2>
                <div className="flex items-center gap-3">
                    {extraHeaderContent}
                    {addAction && (
                        <button onClick={() => addAction()} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg flex items-center transition-all duration-150 text-sm">
                           <PlusCircleIcon className="w-5 h-5 mr-2" /> Adicionar
                        </button>
                    )}
                </div>
            </div>

            {additionalFilterComponent} 

            <input
                type="text"
                placeholder="Buscar em todos os campos (nos itens filtrados)..."
                className="w-full p-3 my-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 shadow-sm"
                value={currentSearchTerm}
                onChange={(e) => setCurrentSearchTerm(e.target.value)}
                aria-label={`Buscar em ${title}`}
            />

            {isLoading && <div className="flex justify-center items-center py-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}
            
            {renderSummary && currentSearchTerm && finalFilteredItems.length > 0 && renderSummary(finalFilteredItems)}

            {!isLoading && finalFilteredItems.length === 0 ? (
                 <div className="text-center py-10 bg-white rounded-lg shadow">
                    <XCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-xl">{emptyMessage}</p>
                    {items.length > 0 && (currentSearchTerm || (activeSpecificFilters && Object.values(activeSpecificFilters).some(v => v !== ''))) && 
                        <p className="text-gray-400 text-sm mt-2">Nenhum resultado para os filtros ou busca atual.</p>}
                    {items.length === 0 && !currentSearchTerm && (!activeSpecificFilters || Object.values(activeSpecificFilters).every(v => v === '')) && 
                        <p className="text-gray-400 text-sm mt-2">Comece adicionando alguns itens!</p>}
                </div>
            ) : null}
             {!isLoading && finalFilteredItems.length > 0 ? ( 
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {finalFilteredItems.map(renderItemCard)}
                </div>
            ) : null}
        </div>
    );
};

  const InventoryContent: React.FC = () => {
    const plainTShirtFilterControls = (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtrar Camisetas Lisas:</h3>
            <div className="flex flex-wrap gap-4 items-end">
                <FilterDropdown 
                    label="Cor" 
                    value={plainTShirtFilters.color} 
                    onChange={e => setPlainTShirtFilters(prev => ({...prev, color: e.target.value as PlainTShirtColor | ''}))}
                    options={PLAIN_T_SHIRT_COLORS.map(c => ({value: c, label: c}))}
                    allOptionLabel="Todas as Cores"
                />
                <FilterDropdown 
                    label="Gênero" 
                    value={plainTShirtFilters.gender} 
                    onChange={e => setPlainTShirtFilters(prev => ({...prev, gender: e.target.value as Gender | ''}))}
                    options={GENDERS.map(g => ({value: g, label: g}))}
                    allOptionLabel="Todos os Gêneros"
                />
                <FilterDropdown 
                    label="Tamanho" 
                    value={plainTShirtFilters.size} 
                    onChange={e => setPlainTShirtFilters(prev => ({...prev, size: e.target.value as TShirtSize | ''}))}
                    options={T_SHIRT_SIZES.map(s => ({value: s, label: s}))}
                    allOptionLabel="Todos os Tamanhos"
                />
                <button 
                    onClick={() => setPlainTShirtFilters({color: '', gender: '', size: ''})}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm transition-colors self-end h-[42px]"
                    aria-label="Limpar filtros de camisetas lisas"
                >
                    Limpar Filtros
                </button>
            </div>
        </div>
    );

    return (
    <div>
      {renderListItems<PlainTShirt>(
        plainTShirts,
        (item) => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[220px]">
            <div>
                <h3 className="text-md font-semibold text-sky-700">{item.color}</h3>
                <p className="text-xs text-gray-500 mb-0.5">{item.gender} - Tam: {item.size}</p>
                {item.sku && <p className="text-xs text-gray-400 italic mb-1">SKU: {item.sku}</p>}
                <p className="text-xs text-gray-500">Fornecedor: {item.supplier || 'N/D'}</p>
                <p className="text-xs text-gray-500 mb-1">Custo: {formatCurrency(item.cost)}</p>
            </div>
            <div className="mt-3">
                 <p className="text-gray-700 text-sm mb-2">Qtd: <span className="font-bold text-2xl text-sky-600">{item.quantity}</span></p>
                <div className="flex justify-end items-center gap-2">
                    <button 
                      onClick={() => openModal('adjustStock', item)}
                      className="p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700 rounded-full transition-colors duration-150 flex items-center text-xs"
                      aria-label={`Reduzir quantidade de ${item.color} ${item.gender} ${item.size}`}
                      title="Reduzir Quantidade"
                    >
                      <MinusCircleIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePlainTShirt(item.id)} 
                      className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-full transition-colors duration-150"
                      aria-label={`Apagar definição de ${item.color} ${item.gender} ${item.size}`}
                      title="Apagar Definição do Item"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
          </div>
        ),
        "Estoque de Camisetas Lisas",
        { 
            addAction: () => openModal('addPlainTShirt'), 
            emptyMessage: "Nenhuma camiseta lisa em estoque.",
            additionalFilterComponent: plainTShirtFilterControls,
            specificFilterFn: plainTShirtFilterFn,
            activeSpecificFilters: plainTShirtFilters
        }
      )}
      <div className="my-8 border-t border-gray-200"></div>
      {renderListItems<Print>( // Prints section - no specific filters added for now beyond search
        prints,
        (item) => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[260px]">
            <div className="flex-grow">
                <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-contain rounded-md mb-3 bg-gray-50 p-1"/>
                <h3 className="text-md font-semibold text-indigo-700 truncate" title={item.name}>{item.name}</h3>
                 {item.sku && <p className="text-xs text-gray-400 italic mb-1">SKU: {item.sku}</p>}
            </div>
             <div className="mt-3">
                <p className="text-gray-700 text-sm mb-2">Qtd: <span className="font-bold text-2xl text-indigo-600">{item.quantity}</span></p>
                <div className="flex justify-end items-center gap-2">
                     <button 
                      onClick={() => openModal('adjustStock', item)}
                      className="p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700 rounded-full transition-colors duration-150 flex items-center text-xs"
                      aria-label={`Reduzir quantidade de ${item.name}`}
                      title="Reduzir Quantidade"
                    >
                      <MinusCircleIcon className="w-4 h-4" />
                    </button>
                    <button 
                    onClick={() => handleDeletePrint(item.id)} 
                    className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-full transition-colors duration-150"
                    aria-label={`Apagar estampa ${item.name}`}
                    title="Apagar Definição da Estampa"
                    >
                    <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
          </div>
        ),
        "Estoque de Estampas",
        { addAction: () => openModal('addPrint'), emptyMessage: "Nenhuma estampa em estoque."}
      )}
    </div>
  )};

  const ProductionContent: React.FC = () => (
    renderListItems<FinishedTShirt>(
      finishedTShirts,
      (item) => (
        <div key={item.id} className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[300px]">
            <div>
                <img src={item.printImageUrl} alt={item.printName} className="w-full h-40 object-contain rounded-md mb-3 bg-gray-50 p-1"/>
                <h3 className="text-md font-semibold text-emerald-700 truncate" title={item.printName}>{item.printName}</h3>
                {item.sku && <p className="text-xs text-gray-400 italic">SKU: {item.sku}</p>}
                <p className="text-gray-500 text-xs">{item.color} / {item.gender} / Tam: {item.size}</p>
            </div>
            <div className="mt-3">
                <p className="text-gray-700 text-sm">Estoque: <span className="font-bold text-xl text-emerald-600">{item.quantityInStock}</span></p>
                <p className="text-gray-700 text-sm">Preço: <span className="font-bold text-green-500 text-lg">{formatCurrency(item.price)}</span></p>
            </div>
        </div>
      ),
      "Camisetas Prontas para Venda",
      { addAction: () => openModal('produceTShirt'), emptyMessage: "Nenhuma camiseta pronta para venda." }
    )
  );
  
  const SalesContent: React.FC = () => {
    const renderSalesSummary = (filteredSales: Sale[]) => {
        const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantitySold, 0);
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalSaleAmount, 0);

        return (
            <div className="my-4 p-4 bg-sky-50 border border-sky-100 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-sky-700 mb-2">Resumo da Busca/Filtro:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <p className="text-gray-600">Itens Vendidos: <span className="font-bold text-sky-800">{totalQuantity}</span></p>
                    <p className="text-gray-600">Receita Total: <span className="font-bold text-sky-800">{formatCurrency(totalRevenue)}</span></p>
                </div>
            </div>
        );
    };

    const uniqueSoldProducts = Array.from(new Set(sales.map(s => s.finishedTShirtId)))
        .map(id => {
            const saleDetails = sales.find(s => s.finishedTShirtId === id)?.finishedTShirtDetails;
            return {
                value: id,
                label: saleDetails ? `${saleDetails.printName} (${saleDetails.color}, ${saleDetails.size})` : id
            };
        });
    
    const salesFilterControls = (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtrar Vendas:</h3>
            <div className="flex flex-wrap gap-4 items-end">
                <FilterDateInput 
                    label="Data Início" 
                    value={salesFilters.startDate}
                    onChange={e => setSalesFilters(prev => ({...prev, startDate: e.target.value}))}
                />
                <FilterDateInput 
                    label="Data Fim" 
                    value={salesFilters.endDate}
                    onChange={e => setSalesFilters(prev => ({...prev, endDate: e.target.value}))}
                />
                <FilterDropdown 
                    label="Produto Vendido" 
                    value={salesFilters.productId} 
                    onChange={e => setSalesFilters(prev => ({...prev, productId: e.target.value}))}
                    options={uniqueSoldProducts}
                    allOptionLabel="Todos os Produtos"
                />
                 <FilterTextInput
                    label="Nome do Cliente"
                    value={salesFilters.clientName}
                    onChange={e => setSalesFilters(prev => ({...prev, clientName: e.target.value}))}
                    placeholder="Buscar cliente..."
                />
                <button 
                    onClick={() => setSalesFilters({startDate: '', endDate: '', productId: '', clientName: ''})}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm transition-colors self-end h-[42px]"
                    aria-label="Limpar filtros de vendas"
                >
                    Limpar Filtros
                </button>
            </div>
        </div>
    );
    
    return renderListItems<Sale>(
        sales,
        (item) => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[220px]">
            <div>
                <h3 className="text-md font-semibold text-amber-700 truncate" title={item.finishedTShirtDetails.printName}>
                {item.finishedTShirtDetails.printName}
                </h3>
                {item.finishedTShirtDetails.sku && <p className="text-xs text-gray-400 italic">SKU: {item.finishedTShirtDetails.sku}</p>}
                {item.clientName && <p className="text-xs text-gray-500 font-medium">Cliente: <span className="font-normal text-gray-600">{item.clientName}</span></p>}
                <p className="text-gray-500 text-xs">
                {item.finishedTShirtDetails.color} / {item.finishedTShirtDetails.gender} / Tam: {item.finishedTShirtDetails.size}
                </p>
                <div className="mt-2 space-y-0.5">
                    <p className="text-gray-600 text-sm">Qtd: <span className="font-semibold">{item.quantitySold}</span></p>
                    <p className="text-gray-600 text-sm">Unit.: <span className="font-semibold">{formatCurrency(item.salePricePerUnit)}</span></p>
                    <p className="text-gray-700 text-sm">Total: <span className="font-bold text-lg text-green-600">{formatCurrency(item.totalSaleAmount)}</span></p>
                </div>
            </div>
            <div className="mt-3 flex justify-between items-center">
                 <p className="text-xs text-gray-400">Data: {formatDate(item.saleDate)}</p>
                 <button 
                  onClick={() => handleDeleteSale(item.id)} 
                  className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-full transition-colors duration-150"
                  aria-label={`Apagar venda ${item.id}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
            </div>
          </div>
        ),
        "Registro de Vendas",
        { 
            addAction: () => openModal('recordSale'), 
            emptyMessage: "Nenhuma venda registrada.",
            renderSummary: renderSalesSummary,
            extraHeaderContent: (
                <button 
                    onClick={() => setShowSalesReport(true)}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg flex items-center transition-all duration-150 text-sm"
                >
                   <DocumentTextIcon className="w-5 h-5 mr-2" /> Gerar Relatório
                </button>
            ),
            additionalFilterComponent: salesFilterControls,
            specificFilterFn: salesFilterFn,
            activeSpecificFilters: salesFilters
        }
      );
  };

  const SalesReportModalContent: React.FC = () => {
    const reportData = calculateSalesReport();

    if (reportData.detailedSales.length === 0) {
        return <p className="text-gray-600 text-center py-5">Nenhuma venda registrada para gerar o relatório.</p>;
    }

    return (
        <div className="text-gray-800">
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-700 mb-3">Resumo Geral do Período (Todas as Vendas)</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p>Total de Itens Vendidos:</p><p className="font-semibold">{reportData.summary.totalItemsSold}</p>
                    <p>Receita Bruta Total:</p><p className="font-semibold">{formatCurrency(reportData.summary.totalRevenue)}</p>
                    <p>Custo Total dos Produtos Vendidos (CPV):</p><p className="font-semibold">{formatCurrency(reportData.summary.totalCostOfGoodsSold)}</p>
                    <p className="text-lg text-green-600">Lucro Bruto Total:</p><p className="font-bold text-lg text-green-600">{formatCurrency(reportData.summary.totalProfit)}</p>
                </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-700 mb-3">Detalhes de Todas as Vendas</h3>
            <div className="overflow-x-auto max-h-[50vh] custom-scrollbar"> 
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-100 sticky top-0 z-10"> 
                        <tr>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Produto (SKU)</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Qtd.</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Preço Unit.</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Total Venda</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Custo Unit.</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Custo Total</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Lucro Unit.</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Lucro Total</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-600 tracking-wider">Data</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.detailedSales.map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{sale.finishedTShirtDetails.printName}</div>
                                    {sale.sku && <div className="text-gray-500 text-xs italic">SKU: {sale.sku}</div>}
                                    <div className="text-gray-500">{sale.finishedTShirtDetails.color}, {sale.finishedTShirtDetails.size}</div>
                                    {sale.clientName && <div className="text-blue-500 text-xs">Cliente: {sale.clientName}</div>}
                                </td>
                                <td className="px-3 py-2">{sale.quantitySold}</td>
                                <td className="px-3 py-2">{formatCurrency(sale.salePricePerUnit)}</td>
                                <td className="px-3 py-2 font-semibold">{formatCurrency(sale.totalSaleAmount)}</td>
                                <td className="px-3 py-2">{formatCurrency(sale.costPerUnit)}</td>
                                <td className="px-3 py-2">{formatCurrency(sale.totalCostForSale)}</td>
                                <td className={`px-3 py-2 ${sale.profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(sale.profitPerUnit)}</td>
                                <td className={`px-3 py-2 font-semibold ${sale.totalProfitForSale >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(sale.totalProfitForSale)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{formatDate(sale.saleDate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };


  const renderActiveTabContent = () => {
    if (isLoading && !isModalOpen) {
      return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div></div>;
    }
    
    if (error && !isModalOpen) { 
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md" role="alert">
                    <p className="font-bold">Ocorreu um Erro!</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }
    
    switch (activeTab) {
      case TAB_OPTIONS[0]: return <DashboardContent />;
      case TAB_OPTIONS[1]: return <InventoryContent />;
      case TAB_OPTIONS[2]: return <ProductionContent />;
      case TAB_OPTIONS[3]: return <SalesContent />;
      default: return null;
    }
  };

  const handleSaleFormFinishedTShirtChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const shirt = finishedTShirts.find(ft => ft.id === selectedId);
    setSaleForm(prev => ({ ...prev, finishedTShirtId: selectedId, quantity: 1 })); 
    setSelectedFinishedTShirtForSale(shirt || null);
};

  const getModalMaxWidth = () => {
    if (showSalesReport) return "max-w-4xl"; 
    if (modalType === 'addPlainTShirt' || modalType === 'addPrint' || modalType === 'produceTShirt' || modalType === 'recordSale' || modalType === 'adjustStock') return "max-w-xl"; 
    return "max-w-lg"; 
  };


  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
      <header className="bg-slate-800 shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center py-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400 mb-3 sm:mb-0">
            {APP_TITLE}
          </h1>
          <nav className="flex flex-wrap justify-center gap-1 sm:gap-2">
            {TAB_OPTIONS.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); /*setSearchTerm('');*/ setError(null); setSuccessMessage(null);}}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75
                  ${activeTab === tab 
                    ? 'bg-sky-500 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                aria-current={activeTab === tab ? 'page' : undefined}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>
      
      {successMessage && !isModalOpen && ( 
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow-md" role="alert">
                <p className="font-bold">Sucesso!</p>
                <p>{successMessage}</p>
            </div>
          </div>
      )}
      


      <main className="container mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-8">
        <div className="bg-white text-gray-800 shadow-xl rounded-lg min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-160px)]">
             {renderActiveTabContent()}
        </div>
      </main>

      <Modal 
        isOpen={isModalOpen || showSalesReport} 
        onClose={() => { closeModal(); setShowSalesReport(false); }} 
        title={
            showSalesReport ? "Relatório de Vendas e Lucratividade" :
            modalType === 'addPlainTShirt' ? "Adicionar Camiseta Lisa" :
            modalType === 'addPrint' ? "Adicionar Estampa" :
            modalType === 'produceTShirt' ? "Produzir Camiseta" :
            modalType === 'recordSale' ? "Registrar Venda" : 
            modalType === 'adjustStock' && itemToAdjustStock ? `Ajustar Estoque: ${'name' in itemToAdjustStock ? itemToAdjustStock.name : `${itemToAdjustStock.color} ${itemToAdjustStock.gender} ${itemToAdjustStock.size}`}` : ""
        }
        maxWidthClass={getModalMaxWidth()}
      >
        
        {error && modalType && !showSalesReport && <p className="mb-3 p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">{error}</p>}
        {successMessage && modalType && !showSalesReport && <p className="mb-3 p-3 text-sm text-green-700 bg-green-100 border border-green-200 rounded-md">{successMessage}</p>}
        
        {showSalesReport && <SalesReportModalContent />}

        {modalType === 'addPlainTShirt' && !showSalesReport && (
          <form onSubmit={(e) => { e.preventDefault(); handleAddPlainTShirt(); }} className="space-y-4">
            <div>
              <label htmlFor="plainSku" className="block text-sm font-medium text-gray-700">SKU (Opcional)</label>
              <input type="text" id="plainSku" value={plainTShirtForm.sku} onChange={e => setPlainTShirtForm({...plainTShirtForm, sku: e.target.value})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" placeholder="Ex: TS-BLK-M-V1"/>
            </div>
            <div>
              <label htmlFor="plainColor" className="block text-sm font-medium text-gray-700">Cor</label>
              <select id="plainColor" value={plainTShirtForm.color} onChange={e => setPlainTShirtForm({...plainTShirtForm, color: e.target.value as PlainTShirtColor})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white">
                {PLAIN_T_SHIRT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="plainGender" className="block text-sm font-medium text-gray-700">Gênero</label>
              <select id="plainGender" value={plainTShirtForm.gender} onChange={e => setPlainTShirtForm({...plainTShirtForm, gender: e.target.value as Gender})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white">
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="plainSize" className="block text-sm font-medium text-gray-700">Tamanho</label>
              <select id="plainSize" value={plainTShirtForm.size} onChange={e => setPlainTShirtForm({...plainTShirtForm, size: e.target.value as TShirtSize})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white">
                {T_SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="plainSupplier" className="block text-sm font-medium text-gray-700">Fornecedor (Opcional)</label>
              <input type="text" id="plainSupplier" value={plainTShirtForm.supplier} onChange={e => setPlainTShirtForm({...plainTShirtForm, supplier: e.target.value})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" placeholder="Nome do Fornecedor"/>
            </div>
            <div>
              <label htmlFor="plainCost" className="block text-sm font-medium text-gray-700">Custo (R$) (Opcional)</label>
              <input type="number" id="plainCost" value={plainTShirtForm.cost} min="0" step="0.01" onChange={e => setPlainTShirtForm({...plainTShirtForm, cost: parseFloat(e.target.value) || 0})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" />
            </div>
            <div>
              <label htmlFor="plainQuantity" className="block text-sm font-medium text-gray-700">Quantidade</label>
              <input type="number" id="plainQuantity" value={plainTShirtForm.quantity} min="1" onChange={e => setPlainTShirtForm({...plainTShirtForm, quantity: parseInt(e.target.value)})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white" required />
            </div>
            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-150">Adicionar ao Estoque</button>
          </form>
        )}
        {modalType === 'addPrint' && !showSalesReport && (
          <form onSubmit={(e) => { e.preventDefault(); handleAddPrint(); }} className="space-y-4">
             <div>
              <label htmlFor="printSku" className="block text-sm font-medium text-gray-700">SKU (Opcional)</label>
              <input type="text" id="printSku" value={printForm.sku} onChange={e => setPrintForm({...printForm, sku: e.target.value})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white" placeholder="Ex: PRINT-LOGO-V2"/>
            </div>
            <div>
              <label htmlFor="printName" className="block text-sm font-medium text-gray-700">Nome da Estampa</label>
              <input type="text" id="printName" value={printForm.name} onChange={e => setPrintForm({...printForm, name: e.target.value})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white" required />
            </div>
            <div>
              <label htmlFor="printImageUrl" className="block text-sm font-medium text-gray-700">URL da Imagem</label>
              <input 
                type="url" 
                id="printImageUrl" 
                value={printForm.imageUrl.startsWith('data:image') ? '' : printForm.imageUrl} 
                onChange={e => setPrintForm({...printForm, imageUrl: e.target.value, localFile: null })} 
                className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white" 
                placeholder="https://example.com/image.png"
              />
            </div>
            <div>
              <label htmlFor="printImageFile" className="block text-sm font-medium text-gray-700">Carregar Imagem (opcional)</label>
              <input 
                type="file" 
                id="printImageFile" 
                accept="image/*"
                onChange={handlePrintImageFileChange} 
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
              />
            </div>
            {printForm.imageUrl && (
                <div className="mt-2 flex flex-col items-center">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img src={printForm.imageUrl} alt="Preview da Estampa" className="max-w-full h-auto max-h-28 object-contain rounded border bg-gray-50 p-1 shadow-sm"/>
                </div>
            )}
            <div>
              <label htmlFor="printQuantity" className="block text-sm font-medium text-gray-700">Quantidade</label>
              <input type="number" id="printQuantity" value={printForm.quantity} min="1" onChange={e => setPrintForm({...printForm, quantity: parseInt(e.target.value)})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white" required />
            </div>
            <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-150">Adicionar Estampa</button>
          </form>
        )}
        {modalType === 'produceTShirt' && !showSalesReport && (
          <form onSubmit={(e) => { e.preventDefault(); handleProduceTShirt(); }} className="space-y-4">
             <div>
                <label htmlFor="prodPlainTShirt" className="block text-sm font-medium text-gray-700">Camiseta Lisa</label>
                <select id="prodPlainTShirt" value={productionForm.plainTShirtId} onChange={e => setProductionForm({...productionForm, plainTShirtId: e.target.value})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white" required disabled={plainTShirts.filter(pt => pt.quantity > 0).length === 0}>
                    {plainTShirts.filter(pt => pt.quantity > 0).length === 0 && <option value="">Nenhuma camiseta lisa disponível</option>}
                     <option value="" disabled={!!productionForm.plainTShirtId && plainTShirts.filter(pt => pt.quantity > 0).length > 0}>Selecione uma camiseta lisa</option>
                    {plainTShirts.filter(pt => pt.quantity > 0).map(pt => <option key={pt.id} value={pt.id}>{pt.sku ? `${pt.sku} - ` : ''}{pt.color} - {pt.gender} - {pt.size} (Disp: {pt.quantity})</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="prodPrint" className="block text-sm font-medium text-gray-700">Estampa</label>
                <select id="prodPrint" value={productionForm.printId} onChange={e => setProductionForm({...productionForm, printId: e.target.value})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white" required disabled={prints.filter(p => p.quantity > 0).length === 0}>
                    {prints.filter(p => p.quantity > 0).length === 0 && <option value="">Nenhuma estampa disponível</option>}
                    <option value="" disabled={!!productionForm.printId && prints.filter(p => p.quantity > 0).length > 0}>Selecione uma estampa</option>
                    {prints.filter(p => p.quantity > 0).map(p => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} - ` : ''}{p.name} (Disp: {p.quantity})</option>)}
                </select>
            </div>
            <div>
              <label htmlFor="prodQuantity" className="block text-sm font-medium text-gray-700">Quantidade a Produzir</label>
              <input type="number" id="prodQuantity" value={productionForm.quantity} min="1" onChange={e => setProductionForm({...productionForm, quantity: parseInt(e.target.value)})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white" required />
            </div>
            <div>
              <label htmlFor="prodPrice" className="block text-sm font-medium text-gray-700">Preço de Venda (R$)</label>
              <input type="number" id="prodPrice" value={productionForm.price} min="0.01" step="0.01" onChange={e => setProductionForm({...productionForm, price: parseFloat(e.target.value)})} className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white" required />
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-150"  disabled={plainTShirts.filter(pt => pt.quantity > 0).length === 0 || prints.filter(p => p.quantity > 0).length === 0 || !productionForm.plainTShirtId || !productionForm.printId}>Produzir Camiseta</button>
          </form>
        )}
        {modalType === 'recordSale' && !showSalesReport && (
          <form onSubmit={(e) => { e.preventDefault(); handleRecordSale(); }} className="space-y-4">
            <div>
                <label htmlFor="saleFinishedTShirt" className="block text-sm font-medium text-gray-700">Camiseta Pronta</label>
                <select 
                    id="saleFinishedTShirt" 
                    value={saleForm.finishedTShirtId} 
                    onChange={handleSaleFormFinishedTShirtChange}
                    className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white" 
                    required 
                    disabled={finishedTShirts.filter(ft => ft.quantityInStock > 0).length === 0}
                >
                    {finishedTShirts.filter(ft => ft.quantityInStock > 0).length === 0 && <option value="">Nenhuma camiseta pronta disponível</option>}
                     <option value="" disabled={!!saleForm.finishedTShirtId && finishedTShirts.filter(ft => ft.quantityInStock > 0).length > 0}>Selecione uma camiseta</option>
                    {finishedTShirts.filter(ft => ft.quantityInStock > 0).map(ft => 
                        <option key={ft.id} value={ft.id}>
                            {ft.sku ? `${ft.sku} - ` : ''}{ft.printName} ({ft.color}, {ft.gender}, {ft.size}) - Estoque: {ft.quantityInStock} - {formatCurrency(ft.price)}
                        </option>
                    )}
                </select>
                {selectedFinishedTShirtForSale && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 shadow-sm">
                        <img src={selectedFinishedTShirtForSale.printImageUrl} alt={selectedFinishedTShirtForSale.printName} className="w-20 h-20 object-contain rounded mx-auto mb-2"/>
                        <p className="text-xs text-center text-gray-600">Estoque: {selectedFinishedTShirtForSale.quantityInStock} | Preço: {formatCurrency(selectedFinishedTShirtForSale.price)}</p>
                    </div>
                )}
            </div>
            <div>
              <label htmlFor="saleClientName" className="block text-sm font-medium text-gray-700">Nome do Cliente (Opcional)</label>
              <input 
                type="text" 
                id="saleClientName" 
                value={saleForm.clientName} 
                onChange={e => setSaleForm({...saleForm, clientName: e.target.value})} 
                className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white" 
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label htmlFor="saleQuantity" className="block text-sm font-medium text-gray-700">Quantidade Vendida</label>
              <input 
                type="number" 
                id="saleQuantity" 
                value={saleForm.quantity} 
                min="1" 
                max={selectedFinishedTShirtForSale?.quantityInStock || 0} 
                onChange={e => {
                    const val = parseInt(e.target.value);
                    const maxStock = selectedFinishedTShirtForSale?.quantityInStock || 0;
                    setSaleForm({...saleForm, quantity: Math.min(Math.max(1, val || 1), maxStock) });
                }}
                className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white" 
                required 
                disabled={!selectedFinishedTShirtForSale || (selectedFinishedTShirtForSale?.quantityInStock || 0) === 0}
              />
            </div>
            <button 
                type="submit" 
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={
                    !selectedFinishedTShirtForSale || 
                    (selectedFinishedTShirtForSale?.quantityInStock || 0) === 0 ||
                    saleForm.quantity <= 0 ||
                    saleForm.quantity > (selectedFinishedTShirtForSale?.quantityInStock || 0)
                }
            >
                Registrar Venda
            </button>
          </form>
        )}

        {modalType === 'adjustStock' && itemToAdjustStock && !showSalesReport && (
            <form onSubmit={(e) => { e.preventDefault(); handleAdjustStockQuantity(); }} className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium text-gray-800">
                        Item: { 'name' in itemToAdjustStock ? itemToAdjustStock.name : `${itemToAdjustStock.color} ${itemToAdjustStock.gender} ${itemToAdjustStock.size}` }
                    </h3>
                    {itemToAdjustStock.sku && <p className="text-sm text-gray-500 italic">SKU: {itemToAdjustStock.sku}</p>}
                    <p className="text-sm text-gray-600">Quantidade Atual em Estoque: <span className="font-bold">{itemToAdjustStock.quantity}</span></p>
                </div>
                <div>
                    <label htmlFor="adjustmentQuantity" className="block text-sm font-medium text-gray-700">Quantidade a Remover</label>
                    <input 
                        type="number" 
                        id="adjustmentQuantity" 
                        value={adjustmentQuantity} 
                        min="1" 
                        max={itemToAdjustStock.quantity}
                        onChange={e => {
                            const val = parseInt(e.target.value);
                            setAdjustmentQuantity(Math.min(Math.max(1, val || 1), itemToAdjustStock.quantity));
                        }}
                        className="mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 bg-white" 
                        required 
                    />
                </div>
                <button 
                    type="submit" 
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-150 disabled:opacity-50"
                    disabled={adjustmentQuantity <= 0 || adjustmentQuantity > itemToAdjustStock.quantity}
                >
                    Confirmar Redução de Estoque
                </button>
            </form>
        )}

      </Modal>
      <footer className="text-center p-6 text-sm text-slate-500 bg-slate-100 border-t border-slate-200">
        © {new Date().getFullYear()} {APP_TITLE}.
      </footer>
    </div>
  );
};

export default App;
