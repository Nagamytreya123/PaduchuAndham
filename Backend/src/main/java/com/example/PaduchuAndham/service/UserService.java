package com.example.PaduchuAndham.service;

import com.example.PaduchuAndham.dto.RegisterRequest;
import com.example.PaduchuAndham.model.User;

public interface UserService {
    User register(RegisterRequest request);
}
