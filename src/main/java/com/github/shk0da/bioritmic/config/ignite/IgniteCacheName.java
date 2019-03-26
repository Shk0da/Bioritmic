package com.github.shk0da.bioritmic.config.ignite;

public enum IgniteCacheName {

    USER("userCache", true),
    LOCATION("locationCache", false),
    MEDIA("mediaCache", false),
    LOCK_STATUS("lockStatusCache", false),
    LOCK_TIME_STAMP("lockTimeStampCache", false)
    ;

    public static final String userCache = "userCache";
    public static final String locationCache = "locationCache";
    public static final String mediaCache = "mediaCache";

    private final String name;
    private final boolean crossLocationReplicate;

    IgniteCacheName(String name, boolean crossLocationReplicate) {
        this.name = name;
        this.crossLocationReplicate = crossLocationReplicate;
    }

    public String getName() {
        return name;
    }

    public boolean isCrossLocationReplicate() {
        return crossLocationReplicate;
    }
}
