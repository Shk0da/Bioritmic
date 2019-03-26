package com.github.shk0da.bioritmic.service;

import lombok.extern.slf4j.Slf4j;
import org.junit.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;

@Slf4j
public class BiroritmicServiceTest {

    private BiroritmicService biroritmicService = new BiroritmicService();

    @Test
    public void getCompare() {
        log.info("{}", biroritmicService.getCompare(
                new Date(LocalDate.of(1990, 2, 14).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()),
                new Date(LocalDate.of(1989, 6, 26).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())
                )
        );
    }
}