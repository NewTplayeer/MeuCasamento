package com.bruno.casamento.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String index() {
        return "index"; // Abre templates/index.html
    }

    @GetMapping("/presenca")
    public String presenca() {
        return "presenca"; // Abre templates/presenca.html
    }

    @GetMapping("/presentes")
    public String presentes() {
        return "presentes"; // Abre templates/presentes.html
    }
}