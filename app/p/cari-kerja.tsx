import React from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCariKerjaLogic } from "../../src/hooks/useCariKerjaLogic";
import CariKerjaHeader from "../../src/components/cari-kerja/CariKerjaHeader";
import CariKerjaSearchBar from "../../src/components/cari-kerja/CariKerjaSearchBar";
import CariKerjaFilters from "../../src/components/cari-kerja/CariKerjaFilters";
import CariKerjaMap from "../../src/components/cari-kerja/CariKerjaMap";
import CariKerjaList from "../../src/components/cari-kerja/CariKerjaList";
import CariKerjaDetailModal from "../../src/components/cari-kerja/CariKerjaDetailModal";
import CariKerjaModals from "../../src/components/cari-kerja/CariKerjaModals";

export default function CariKerjaPage() {
  const logic = useCariKerjaLogic();
  const { loading, fetchNearbyJobs, selectedJob, viewMode } = logic;

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      <CariKerjaHeader logic={logic} />

      {viewMode === "list" ? (
        // FlatList untuk cari-kerja: virtualized, hanya render 6 job awal (hemat RAM), scroll baru load
        <View className="flex-1 max-w-[440px] w-full self-center">
          <CariKerjaSearchBar logic={logic} />
          <CariKerjaFilters logic={logic} />
          <CariKerjaList logic={logic} />
        </View>
      ) : (
        <View className="flex-1" style={{ flex: 1 }}>
          <CariKerjaMap logic={logic} />
        </View>
      )}

      {/* Modal & Toast */}
      <CariKerjaDetailModal logic={logic} />
      <CariKerjaModals logic={logic} />
    </SafeAreaView>
  );
}
