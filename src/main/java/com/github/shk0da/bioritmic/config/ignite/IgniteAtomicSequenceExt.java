package com.github.shk0da.bioritmic.config.ignite;

import org.apache.ignite.IgniteAtomicSequence;
import org.apache.ignite.IgniteException;

/**
 * Allows override method close for IgniteAtomicSequence
 */
public interface IgniteAtomicSequenceExt extends IgniteAtomicSequence {

    /**
     * Overrides and does nothing!
     * If you really want to close use closeForce()
     */
    @Override
    void close();

    /**
     * Removes this atomic sequence.
     *
     * @throws IgniteException If operation failed.
     */
    void closeForce();

    /**
     * Get original IgniteAtomicSequence
     */
    IgniteAtomicSequence getOriginal();


    /**
     * Recreate IgniteAtomicSequence
     */
    void recreate();
}
