package com.example.PaduchuAndham.controller;

import com.example.PaduchuAndham.dto.AuthResponse;
import com.example.PaduchuAndham.dto.LoginRequest;
import com.example.PaduchuAndham.dto.RegisterRequest;
import com.example.PaduchuAndham.model.User;
import com.example.PaduchuAndham.security.JwtUtil;
import com.example.PaduchuAndham.service.CustomUserDetailsService;
import com.example.PaduchuAndham.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        User u = userService.register(req);
        return ResponseEntity.ok(u); // you may want to map to DTO without password
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        try {
            Authentication authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
            );
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        UserDetails ud = userDetailsService.loadUserByUsername(req.getEmail());
        String token = jwtUtil.generateToken(ud.getUsername());
        return ResponseEntity.ok(new AuthResponse(token));
    }

}
