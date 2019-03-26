package com.github.shk0da.bioritmic.util;

import com.sun.management.OperatingSystemMXBean;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryUsage;

import static org.apache.ignite.configuration.DataStorageConfiguration.DFLT_DATA_REGION_INITIAL_SIZE;

@Slf4j
@UtilityClass
public class IgniteUtils {

    private static final double DATA_REGION_PERCENT = 0.80;

    public static long calculateNonHeapMemoryForDataRegion(long offHeapDataRegionMb) {
        long calculatedSizeForDataRegion = Math.max(offHeapDataRegionMb * 1024L * 1024L, DFLT_DATA_REGION_INITIAL_SIZE);
        try {
            MemoryUsage memoryUsageHeap = ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
            long maxHeapSet = memoryUsageHeap.getMax();
            long totalPhysicalRam = ((OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean()).getTotalPhysicalMemorySize();
            if (maxHeapSet > 0 && totalPhysicalRam > 0) {
                long available = totalPhysicalRam - maxHeapSet;
                if (available > 0) {
                    if (available <= calculatedSizeForDataRegion) {
                        calculatedSizeForDataRegion = (long) Math.ceil(DATA_REGION_PERCENT * available);
                        log.error("available bytes={} is less than offHeapDataRegionMb={} ! maxHeapSet={}, totalPhysicalRam={}, new calculatedSizeForDataRegion={}",
                                available, offHeapDataRegionMb, maxHeapSet, totalPhysicalRam, calculatedSizeForDataRegion);
                    } else {
                        log.info("calculatedSizeForDataRegion={} from offHeapDataRegionMb={}",
                                calculatedSizeForDataRegion, offHeapDataRegionMb);
                    }
                } else {
                    log.error("Looks like too high Heap Usage! available={} is <= 0! will be used as set calculatedSizeForDataRegion={}! maxHeapSet={}, totalPhysicalRam={}",
                            available, calculatedSizeForDataRegion, maxHeapSet, totalPhysicalRam);
                }
            } else {
                log.error("Fail to get heap and non heap size! calculatedSizeForDataRegion={}, maxHeapSet={}, totalPhysicalRam={}",
                        calculatedSizeForDataRegion, maxHeapSet, totalPhysicalRam);
            }
        } catch (Exception e) {
            log.error("Fail to get heap and non heap size! calculatedSizeForDataRegion={}", calculatedSizeForDataRegion, e);
        }

        return calculatedSizeForDataRegion;
    }
}
