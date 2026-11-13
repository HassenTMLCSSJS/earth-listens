from earth_pipeline.narration import narration_hash


def test_narration_hash_matches_the_typescript_vector():
    digest = narration_hash("en", "Earth is always making a sound.")
    assert digest == "edbf3fa1a9a37c0096759cb86926847f5e5838dcbc4e72af6a8b78d68a483306"
    assert len(digest) == 64


def test_narration_hash_changes_with_language():
    assert narration_hash("en", "Start.") != narration_hash("ar", "Start.")
