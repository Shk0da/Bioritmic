package com.github.shk0da.bioritmic.config.ignite;

import lombok.extern.slf4j.Slf4j;
import org.apache.ignite.Ignite;
import org.apache.ignite.IgniteAtomicSequence;
import org.apache.ignite.IgniteException;

import java.util.concurrent.atomic.AtomicReference;

@Slf4j
public class IgniteAtomicSequenceExtImpl implements IgniteAtomicSequenceExt {

    public static final String DEFERRED_RESULT_ID_GENERATOR = "deferredResultIdGenerator";

    private final Ignite ignite;
    private final AtomicReference<IgniteAtomicSequence> igniteAtomicSequence;

    public IgniteAtomicSequenceExtImpl(Ignite ignite) {
        this.ignite = ignite;
        igniteAtomicSequence = new AtomicReference<>(ignite.atomicSequence(DEFERRED_RESULT_ID_GENERATOR, 0, true));
    }

    @Override
    public String name() {
        return igniteAtomicSequence.get().name();
    }

    @Override
    public long get() throws IgniteException {
        return igniteAtomicSequence.get().get();
    }

    @Override
    public long incrementAndGet() throws IgniteException {
        return igniteAtomicSequence.get().incrementAndGet();
    }

    @Override
    public long getAndIncrement() throws IgniteException {
        return igniteAtomicSequence.get().getAndIncrement();
    }

    @Override
    public long addAndGet(long l) throws IgniteException {
        return igniteAtomicSequence.get().addAndGet(l);
    }

    @Override
    public long getAndAdd(long l) throws IgniteException {
        return igniteAtomicSequence.get().getAndAdd(l);
    }

    @Override
    public int batchSize() {
        return igniteAtomicSequence.get().batchSize();
    }

    @Override
    public void batchSize(int size) {
        igniteAtomicSequence.get().batchSize(size);
    }

    @Override
    public boolean removed() {
        return igniteAtomicSequence.get().removed();
    }

    @Override
    public void close() {
        log.warn("Trying to close IgniteAtomicSequenceExtImpl! Do nothing! If you really want to close - use closeForce()");
    }

    @Override
    public void closeForce() {
        igniteAtomicSequence.get().close();
    }

    @Override
    public IgniteAtomicSequence getOriginal() {
        return igniteAtomicSequence.get();
    }

    @Override
    public void recreate() {
        igniteAtomicSequence.set(ignite.atomicSequence(DEFERRED_RESULT_ID_GENERATOR, 0, true));
    }
}
