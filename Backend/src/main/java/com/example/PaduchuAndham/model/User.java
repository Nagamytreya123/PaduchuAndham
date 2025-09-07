package com.example.PaduchuAndham.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;

    private String name;
    private String email;
    private String password; // BCrypt hashed
    private String role = "ROLE_USER"; // default role
    private String provider = "local"; // local or google etc.
}
