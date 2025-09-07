package com.example.PaduchuAndham.service;

import com.example.PaduchuAndham.dto.RegisterRequest;
import com.example.PaduchuAndham.exception.ResourceAlreadyExistsException;
import com.example.PaduchuAndham.model.User;
import com.example.PaduchuAndham.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserServiceImpl(UserRepository repo, PasswordEncoder passwordEncoder) {
        this.userRepository = repo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResourceAlreadyExistsException("Email already registered");
        }
        User u = new User();
        u.setName(request.getName());
        u.setEmail(request.getEmail().toLowerCase().trim());
        u.setPassword(passwordEncoder.encode(request.getPassword()));
        u.setProvider("local");
        u.setRole("ROLE_USER");
        return userRepository.save(u);
    }
}
