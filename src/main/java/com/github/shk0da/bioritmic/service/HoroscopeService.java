package com.github.shk0da.bioritmic.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

@Service
public class HoroscopeService {

    public enum Element {
        Unknown, Fire, Earth, Air, Water
    }

    public enum Signs {
        Capricorn, Aquarius, Pisces, Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius;

        private static final Set<Signs> FIRE = new HashSet<Signs>() {{
            add(Aries);
            add(Leo);
            add(Sagittarius);
        }};

        private static final Set<Signs> EARTH = new HashSet<Signs>() {{
            add(Taurus);
            add(Virgo);
            add(Capricorn);
        }};

        private static final Set<Signs> AIR = new HashSet<Signs>() {{
            add(Gemini);
            add(Libra);
            add(Aquarius);
        }};

        private static final Set<Signs> WATER = new HashSet<Signs>() {{
            add(Cancer);
            add(Scorpio);
            add(Pisces);
        }};

        public Element getElement() {
            if (FIRE.contains(this)) return Element.Fire;
            if (EARTH.contains(this)) return Element.Earth;
            if (AIR.contains(this)) return Element.Air;
            if (WATER.contains(this)) return Element.Water;
            return Element.Unknown;
        }

        public Signs of(Date birthday) {
            LocalDate localDate = LocalDate.from(birthday.toInstant());
            int day = localDate.getDayOfMonth();
            int month = localDate.getMonthValue();
            int[] signsStart = {21, 20, 20, 20, 20, 20, 21, 22, 23, 23, 23, 23, 21};
            return Signs.values()[day < signsStart[month] ? month - 1 : month % 12];
        }
    }

    public boolean isCompatibility(Signs first, Signs second) {
        return (first != second && first.getElement() == second.getElement())
                || (Element.Earth == first.getElement() && Element.Water == second.getElement())
                || (Element.Earth == second.getElement() && Element.Water == first.getElement())
                || (Element.Air == first.getElement() && Element.Fire == second.getElement())
                || (Element.Air == second.getElement() && Element.Fire == first.getElement());
    }
}
