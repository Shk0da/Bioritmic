package com.github.shk0da.bioritmic.service;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class BiroritmicService {

    @Value("${biroritmicService.compatibility:60}")
    private double compatibility;

    public enum Biorhythm {
        Physical(23.6884, "corresponds to the lower chakra Muladhara"),
        Emotional(28.426125, "the second chakra Svadhistana"),
        Intellectual(33.163812, "the third Chakra of Manipur"),
        Heart(37.901499, "the fourth chakra Anahata"),
        Creative(42.6392, "the fifth chakra Vishudha"),
        Intuitive(47.3769, "the sixth chakra of Ajna"),
        Higher(52.1146, "the seventh chakra Sahasrara");

        @Getter
        private Double cycle; // in days
        @Getter
        private String description;

        Biorhythm(Double cycle, String description) {
            this.cycle = cycle;
            this.description = description;
        }
    }

    public Map<Biorhythm, Double> getBiorhythms(Date birthday) {
        long livedDays = TimeUnit.DAYS.convert(new Date().getTime() - birthday.getTime(), TimeUnit.MILLISECONDS);
        Map<Biorhythm, Double> result = new HashMap<>();
        for (Biorhythm biorhythm : Biorhythm.values()) {
            result.put(biorhythm, (Math.sin(2 * Math.PI * livedDays / biorhythm.getCycle())) * 100);
        }
        return result;
    }

    public Map<Biorhythm, Integer> getCompare(Date birthdayFirst, Date birthdaySecond) {
        long livedDaysDiff = TimeUnit.DAYS.convert(Math.abs(birthdayFirst.getTime() - birthdaySecond.getTime()), TimeUnit.MILLISECONDS);
        Map<Biorhythm, Integer> result = new HashMap<>();
        for (Biorhythm biorhythm : Biorhythm.values()) {
            int rhythm = (int) Math.floor(((livedDaysDiff / biorhythm.getCycle()) - Math.floor(livedDaysDiff / biorhythm.getCycle())) * 100);
            result.put(biorhythm, rhythm > 50 ? ((rhythm - 50) * 2) : (-1) * ((rhythm - 50) * 2));
        }

        return result;
    }

    public boolean isCompatibility(Date birthdayFirst, Date birthdaySecond) {
        Map<Biorhythm, Integer> compare = getCompare(birthdayFirst, birthdaySecond);
        double average = compare.values().stream().mapToInt(Integer::intValue).sum() / compare.size();
        return average >= compatibility;
    }
}
