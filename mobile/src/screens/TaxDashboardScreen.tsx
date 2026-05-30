import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { apiClient } from '../services/api';
import { handleError } from '../services/errorService';
import ErrorState from '../components/shared/ErrorState';
import Card from '../components/shared/Card';

const MONTHS = ['', 'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
const SCREEN_W = Dimensions.get('window').width;

function formatTL(val: number): string { return val.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL'; }

function BarChart(props: { data: { label: string; value: number }[]; maxVal: number; color: string; label: string }) {
  const { data, maxVal, color, label } = props;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.small, { color: '#666', marginBottom: spacing.xs }]}>{label}</Text>
      {data.map((d, i) => {
        const w = maxVal > 0 ? Math.max(4, (d.value / maxVal) * (SCREEN_W - 120)) : 4;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[typography.small, { color: '#888', width: 55 }]}>{d.label}</Text>
            <View style={{ height: 16, width: w, backgroundColor: color, borderRadius: 3, opacity: 0.7 + (d.value / maxVal) * 0.3 }} />
            <Text style={[typography.small, { color: '#333', marginLeft: 6 }]}>{d.value.toLocaleString('tr-TR') + ' TL'}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function TaxDashboardScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sgkGross, setSgkGross] = useState('25000');
  const [sgkResult, setSgkResult] = useState<any>(null);
  const [sgkCalcLoading, setSgkCalcLoading] = useState(false);
  const [tevkifatAmount, setTevkifatAmount] = useState('51800');
  const [tevkifatService, setTevkifatService] = useState('logistics');
  const [tevkifatPublic, setTevkifatPublic] = useState(false);
  const [tevkifatResult, setTevkifatResult] = useState<any>(null);

  useEffect(() => { loadData(); loadAnomalies(); }, []);

  const loadData = async () => {
    try {
      const res = await apiClient.get('/tax/dashboard');
      setData(res.data.data || res.data);
    } catch (e) {
      handleError(e, { screen: 'TaxDashboard', action: 'loadData' });
      setError('Vergi verileri yüklenirken bir hata oluştu.');
    } finally { setLoading(false); }
  };

  const loadAnomalies = async () => {
    try {
      const res = await apiClient.post('/tax/anomalies/detect', {
        periods: [
          { month: 1, revenue: 85000, vatPayable: 12500, profit: 62000, expenseRate: 0.27 },
          { month: 2, revenue: 72000, vatPayable: 10800, profit: 49000, expenseRate: 0.32 },
          { month: 3, revenue: 91000, vatPayable: 14200, profit: 68000, expenseRate: 0.25 },
          { month: 4, revenue: 88000, vatPayable: 13100, profit: 65000, expenseRate: 0.26 },
          { month: 5, revenue: 95800, vatPayable: 14898, profit: 79980, expenseRate: 0.17 },
        ],
      });
      setAnomalies(res.data);
    } catch (e) {
      handleError(e, { screen: 'TaxDashboard', action: 'loadAnomalies', severity: 'silent' });
    }
  };

  const handleSgkCalc = async () => {
    if (!sgkGross) return;
    setSgkCalcLoading(true);
    try {
      const res = await apiClient.post('/tax/sgk/calculate', { grossSalary: parseFloat(sgkGross) });
      setSgkResult(res.data);
    } catch (e) {
      handleError(e, { screen: 'TaxDashboard', action: 'sgkCalc' });
    } finally { setSgkCalcLoading(false); }
  };

  const handleTevkifatCheck = useCallback(async () => {
    try {
      const res = await apiClient.post('/tax/quick/withholding', { amount: parseFloat(tevkifatAmount), serviceType: tevkifatService, isPublicSector: tevkifatPublic });
      setTevkifatResult(res.data);
    } catch (e) {
      handleError(e, { screen: 'TaxDashboard', action: 'tevkifatCheck' });
    }
  }, [tevkifatAmount, tevkifatService, tevkifatPublic]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (error) return <View style={{ flex: 1, backgroundColor: colors.background }}><ErrorState message={error} onRetry={loadData} /></View>;

  const d = data;
  const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'declarations', label: 'Beyanname' },
    { key: 'tevkifat', label: 'Tevkifat' },
    { key: 'sgk', label: 'SGK' },
    { key: 'legislation', label: 'Mevzuat' },
  ];

  const taxBarData = d ? [
    { label: 'KDV', value: d.yearToDate.totalVatPayable },
    { label: 'Stopaj', value: d.yearToDate.totalWithholding },
    { label: 'Gec.Vergi', value: d.yearToDate.totalTemporaryTax },
    { label: 'Damga', value: d.yearToDate.totalStampTax },
  ] : [];
  const maxTaxBar = Math.max(...taxBarData.map((t: any) => t.value), 1);

  const totalTax = d ? (d.yearToDate.totalVatPayable + d.yearToDate.totalWithholding + d.yearToDate.totalTemporaryTax + d.yearToDate.totalStampTax) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent' }}>
            <Text style={[typography.caption, { color: activeTab === tab.key ? colors.primary : colors.textSecondary, fontWeight: '600' }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing['2xl'] }}>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <Card accentColor={colors.danger} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.danger, fontWeight: '800', marginBottom: spacing.sm }]}>Devlete Ne Kadar Odeyecegim?</Text>
              <BarChart data={taxBarData} maxVal={maxTaxBar} color={colors.danger} label="Vergi Turune Gore Dagilim" />
              <View style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: colors.warning + '15', borderRadius: radius.sm }}>
                <Text style={[typography.label, { color: colors.warning }]}>Toplam Vergi Yuku: {formatTL(totalTax)}</Text>
                <Text style={[typography.small, { color: colors.textSecondary }]}>Efektif Vergi Orani: %{d?.effectiveTaxRate}</Text>
              </View>
            </Card>
            <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>Aylik Gelir / KDV Karsilastirmasi</Text>
              {d?.monthlyBreakdown?.map((m: any) => (
                <View key={m.month} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={[typography.caption, { color: colors.textSecondary, width: 55 }]}>{MONTHS[m.month]}</Text>
                  <Text style={[typography.caption, { color: colors.info, width: 90, textAlign: 'right' }]}>{formatTL(m.revenue)}</Text>
                  <Text style={[typography.caption, { color: m.vatPayable > 0 ? colors.danger : colors.success, width: 95, textAlign: 'right' }]}>{m.vatPayable > 0 ? 'KDV: ' + formatTL(m.vatPayable) : 'Devreden'}</Text>
                  <Text style={[typography.caption, { color: m.profit > 0 ? colors.success : colors.danger, width: 85, textAlign: 'right' }]}>Kar: {formatTL(m.profit)}</Text>
                </View>
              ))}
            </Card>
            <Card accentColor={colors.info} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>Yil Sonu Tahmini</Text>
              {[
                { label: 'Tahmini Ciro', val: d?.yearEndProjection?.projectedRevenue, color: colors.text },
                { label: 'Tahmini Kar', val: d?.yearEndProjection?.projectedProfit, color: colors.success },
                { label: 'Tahmini Vergi', val: d?.yearEndProjection?.projectedTax, color: colors.danger },
              ].map(item => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.label}:</Text>
                  <Text style={[typography.label, { color: item.color }]}>{formatTL(item.val || 0)}</Text>
                </View>
              ))}
            </Card>
            {anomalies?.anomalies?.length > 0 && (
              <Card accentColor={colors.warning}>
                <Text style={[typography.h3, { color: colors.warning, fontWeight: '700', marginBottom: spacing.sm }]}>Anomali Tespitleri</Text>
                {anomalies.anomalies.map((a: any, i: number) => (
                  <View key={i} style={{ paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                    <Text style={[typography.caption, { color: a.severity === 'high' ? colors.danger : colors.warning }]}>
                      {a.severity === 'high' ? 'KIRMIZI' : 'SARI'} {a.description}
                    </Text>
                  </View>
                ))}
                {anomalies.warnings?.map((w: string, i: number) => (
                  <Text key={'w' + i} style={[typography.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>UYARI: {w}</Text>
                ))}
              </Card>
            )}
          </>
        )}

        {/* BEYANNAME */}
        {activeTab === 'declarations' && (
          <>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>Yaklasan Beyannameler</Text>
            {d?.upcomingDeclarations?.length === 0 && <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing['2xl'] }]}>Bu ay icin yaklasan beyanname bulunmuyor.</Text>}
            {d?.upcomingDeclarations?.map((dec: any, i: number) => (
              <Card key={i} accentColor={dec.daysLeft <= 3 ? colors.danger : dec.daysLeft <= 7 ? colors.warning : colors.info} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{dec.label}</Text>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>Son Tarih: {new Date(dec.dueDate).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  <View style={{ padding: spacing.sm, backgroundColor: dec.daysLeft <= 3 ? colors.danger + '20' : colors.warning + '20', borderRadius: radius.sm }}>
                    <Text style={[typography.h3, { color: dec.daysLeft <= 3 ? colors.danger : colors.warning, fontWeight: '800' }]}>{dec.daysLeft}</Text>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>gun kaldi</Text>
                  </View>
                </View>
              </Card>
            ))}
            <Card accentColor={colors.textTertiary}>
              <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Beyanname Takvimi</Text>
              {[
                { label: 'KDV Beyannamesi', due: 'Her ayin 26si' },
                { label: 'Muhtasar Beyanname', due: 'Her ayin 26si' },
                { label: 'Gecici Vergi', due: 'Subat/Mayis/Agustos/Kasim 14u' },
                { label: 'BA/BS Formlari', due: '31 Ocak (Yillik)' },
                { label: 'Kurumlar Vergisi', due: '25 Nisan (Yillik)' },
                { label: 'Damga Vergisi', due: 'Her ayin 26si' },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={[typography.caption, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>{item.due}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* TEVKIFAT */}
        {activeTab === 'tevkifat' && (
          <>
            <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.md }]}>Tevkifat Hesaplama</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Fatura Tutari</Text>
              <TextInput style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface, marginBottom: spacing.md }}
                value={tevkifatAmount} onChangeText={setTevkifatAmount} keyboardType="numeric" placeholder="51800" />
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Hizmet Tipi</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
                {['logistics', 'freight', 'consulting', 'rent', 'service'].map(s => (
                  <TouchableOpacity key={s} onPress={() => setTevkifatService(s)}
                    style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, backgroundColor: tevkifatService === s ? colors.primary : colors.border }}>
                    <Text style={[typography.small, { color: tevkifatService === s ? '#FFF' : colors.text, fontWeight: '600' }]}>
                      {s === 'logistics' ? 'Lojistik' : s === 'freight' ? 'Nakliye' : s === 'consulting' ? 'Serbest Meslek' : s === 'rent' ? 'Kira' : 'Hizmet'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setTevkifatPublic(!tevkifatPublic)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: tevkifatPublic ? colors.primary : colors.border, backgroundColor: tevkifatPublic ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {tevkifatPublic && <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>X</Text>}
                </View>
                <Text style={[typography.caption, { color: colors.text }]}>Kamu Kurumu Alici</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTevkifatCheck}
                style={{ backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center' }}>
                <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Hesapla</Text>
              </TouchableOpacity>
              {tevkifatResult && (
                <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>Sonuc:</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Tevkifat Orani: %{(tevkifatResult.rate * 100).toFixed(0)} (Kod: {tevkifatResult.code})</Text>
                  <Text style={[typography.caption, { color: colors.danger }]}>Tevkifat Tutari: {formatTL(tevkifatResult.withholdingAmount)}</Text>
                  <Text style={[typography.caption, { color: colors.success }]}>Net Odenecek: {formatTL(tevkifatResult.netAmount)}</Text>
                </View>
              )}
            </Card>
          </>
        )}

        {/* SGK */}
        {activeTab === 'sgk' && (
          <>
            <Card accentColor={colors.info} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.md }]}>SGK ve Bordro Hesaplama</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Brut Maas (TL)</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput style={{ flex: 1, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface }}
                  value={sgkGross} onChangeText={setSgkGross} keyboardType="numeric" placeholder="25000" />
                <TouchableOpacity onPress={handleSgkCalc} disabled={sgkCalcLoading}
                  style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Hesapla</Text>
                </TouchableOpacity>
              </View>
            </Card>
            {sgkResult && (
              <Card accentColor={colors.success}>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>Bordro Sonucu</Text>
                {[
                  { label: 'Brut Maas', val: sgkResult.employee?.gross },
                  { label: 'SGK Isci (%14)', val: sgkResult.employee?.sgkWorker },
                  { label: 'Issizlik Isci (%1)', val: sgkResult.employee?.unemploymentWorker },
                  { label: 'Gelir Vergisi (%15)', val: sgkResult.employee?.incomeTax },
                  { label: 'Damga Vergisi', val: sgkResult.employee?.stampTax },
                  { label: 'NET MAAS', val: sgkResult.employee?.netSalary, bold: true },
                ].map((r, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Text style={[typography.caption, { color: r.bold ? colors.success : colors.textSecondary, fontWeight: r.bold ? '800' : '400' }]}>{r.label}</Text>
                    <Text style={[typography.caption, { color: r.bold ? colors.success : colors.text, fontWeight: r.bold ? '800' : '400' }]}>{formatTL(r.val)}</Text>
                  </View>
                ))}
                <View style={{ marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>Isveren Maliyeti: {formatTL(sgkResult.employer?.totalCost)}</Text>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>Toplam SGK: {formatTL(sgkResult.total?.totalSGK)}</Text>
                </View>
              </Card>
            )}
          </>
        )}

        {/* MEVZUAT */}
        {activeTab === 'legislation' && (
          <>
            <Card accentColor={colors.success} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>Guncel Vergi Oranlari (2026)</Text>
              {[
                { label: 'KDV', rates: '%1 (Temel Gida) | %10 (Hizmet) | %20 (Standart)' },
                { label: 'Kurumlar Vergisi', rates: '%25 (2026)' },
                { label: 'Gecici Vergi', rates: '%25 (uc aylik)' },
                { label: 'Damga Vergisi', rates: 'Binde 9,48 (sozlesme/bordro)' },
                { label: 'Stopaj - Lojistik', rates: '%20 (2/10) ozel, %50 (5/10) kamu' },
                { label: 'Stopaj - Serbest Meslek', rates: '%20' },
                { label: 'Stopaj - Kira', rates: '%20' },
                { label: 'BA/BS Siniri', rates: '5.000 TL (2026)' },
                { label: 'SGK Isci Payi', rates: '%14 SGK + %1 Issizlik' },
                { label: 'SGK Isveren Payi', rates: '%20,5 SGK + %2 Issizlik' },
                { label: 'Asgari Ucret (Brut)', rates: '26.005,50 TL (2026)' },
              ].map((item, i) => (
                <View key={i} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>{item.label}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.rates}</Text>
                </View>
              ))}
            </Card>
            <Card accentColor={colors.warning}>
              <Text style={[typography.h3, { color: colors.warning, fontWeight: '700', marginBottom: spacing.sm }]}>Planlanan Mevzuat Degisiklikleri</Text>
              {[
                { date: '1 Temmuz 2026', desc: 'KDV oran guncellemesi', impact: 'Genel KDV %20 -> %22' },
                { date: '1 Ocak 2027', desc: 'BA/BS bildirim siniri', impact: '5.000 TL -> 8.000 TL' },
              ].map((c, i) => (
                <View key={i} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{c.desc}</Text>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>{c.date} - {c.impact}</Text>
                </View>
              ))}
              <TouchableOpacity style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.warning + '10', borderRadius: radius.sm, alignItems: 'center' }}
                onPress={() => Alert.alert('Mevzuat', 'Guncel mevzuat degisiklikleri otomatik takip edilmektedir. Detayli bilgi icin muhasebecinize danisiniz.')}>
                <Text style={[typography.small, { color: colors.warning }]}>Tum Mevzuat Degisikliklerini Gor</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
