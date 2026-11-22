use tauri::Url;

fn serialized_origin(input: &str) -> String {
    Url::parse(input)
        .expect("the regression fixture is a valid URL")
        .origin()
        .ascii_serialization()
}

#[test]
fn blob_origins_preserve_https_and_bound_nested_input() {
    assert_eq!(
        serialized_origin("https://example.com/path"),
        "https://example.com"
    );
    assert_eq!(
        serialized_origin("blob:https://example.com/id"),
        "https://example.com"
    );
    for input in ["blob:blob:https://example.com/", "blob:ws://example.com/"] {
        assert_eq!(
            serialized_origin(input),
            "null",
            "opaque origin for {input}"
        );
    }

    let input = format!("{}https://example.com/", "blob:".repeat(10_000));
    let result = std::thread::Builder::new()
        .stack_size(2 * 1024 * 1024)
        .spawn(move || serialized_origin(&input))
        .expect("create the bounded-stack regression thread")
        .join()
        .expect("origin computation must complete without a stack overflow");
    assert_eq!(result, "null");
}
