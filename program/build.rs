fn main() {
    // Only link syscalls when production-syscalls feature is enabled
    if cfg!(feature = "production-syscalls") {
        println!("cargo:rustc-link-search=native=/usr/lib");
        println!("cargo:rustc-link-lib=dylib=arch_syscalls");
    }
    
    // Add a cfg flag so we can detect test mode in our code
    if cfg!(test) {
        println!("cargo:rustc-cfg=use_mock_syscalls");
    }
} 